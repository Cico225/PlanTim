import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCheckCircle, FiPlay, FiFile } from 'react-icons/fi';
import { lmsService, Lesson } from '@/services/lmsService';
import VideoPlayer from './VideoPlayer';
import toast from 'react-hot-toast';

export default function LessonView() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  // Check if video is from YouTube or Vimeo (requires iframe)
  const isExternalVideo = (url: string): boolean => {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com');
  };

  // Convert YouTube URL to embed format
  const getVideoEmbedUrl = (url: string): string => {
    if (!url) return '';
    
    // Already an embed URL
    if (url.includes('youtube.com/embed/') || url.includes('youtu.be/')) {
      return url;
    }
    
    // YouTube watch URL
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (youtubeMatch && youtubeMatch[1]) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    
    // Vimeo URL
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch && vimeoMatch[1]) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    
    // Return as-is if it's already an embed URL or unknown format
    return url;
  };

  useEffect(() => {
    if (courseId && lessonId) {
      loadLesson();
    }
  }, [courseId, lessonId]);

  const loadLesson = async () => {
    try {
      setLoading(true);
      const data = await lmsService.getLesson(Number(courseId), Number(lessonId));
      console.log('📚 Loaded lesson data:', {
        image_url: data.image_url,
        additional_files: data.additional_files,
        attachments: data.attachments,
      });
      setLesson(data);
    } catch (error: any) {
      console.error('Failed to load lesson:', error);
      toast.error('Neuspješno učitavanje lekcije');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!courseId || !lessonId) return;
    try {
      setCompleting(true);
      await lmsService.completeLesson(Number(courseId), Number(lessonId));
      toast.success('Lekcija završena');
      loadLesson();
    } catch (error: any) {
      console.error('Failed to complete lesson:', error);
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="p-6">
        <div className="card p-12 text-center">
          <h3 className="text-xl font-semibold">Lekcija nije pronađena</h3>
        </div>
      </div>
    );
  }

  const isCompleted = lesson.user_progress?.is_completed;

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6 max-w-full overflow-x-hidden">
      <button
        onClick={() => navigate(`/lms/courses/${courseId}`)}
        className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
      >
        <FiArrowLeft className="w-4 h-4" />
        Nazad na kurs
      </button>

      <div className="card p-4 sm:p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {lesson.title}
        </h1>
        
        {lesson.description && (
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {lesson.description}
          </p>
        )}

        {lesson.video_url && (
          <div className="mb-6">
            {isExternalVideo(lesson.video_url) ? (
              // YouTube/Vimeo - use iframe
              <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
                <iframe
                  src={getVideoEmbedUrl(lesson.video_url)}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  title={lesson.title}
                ></iframe>
              </div>
            ) : (
              // Direct video file - use advanced VideoPlayer with progress tracking
              <VideoPlayer
                src={lesson.video_url}
                courseId={Number(courseId)}
                lessonId={Number(lessonId)}
                title={lesson.title}
                onComplete={() => {
                  toast.success('Video pogledano!');
                }}
              />
            )}
          </div>
        )}

        {lesson.image_url && (
          <div className="mb-6">
            <img
              src={lesson.image_url}
              alt={lesson.title}
              className="w-full max-h-96 object-contain rounded-lg border border-gray-200 dark:border-gray-700"
              onError={(e) => {
                console.error('❌ Failed to load image:', lesson.image_url);
                const img = e.target as HTMLImageElement;
                img.style.display = 'none';
              }}
            />
          </div>
        )}
        

        {lesson.content && (
          <div
            className="prose dark:prose-invert max-w-none mb-6 overflow-x-auto"
            style={{ maxWidth: '100%', wordWrap: 'break-word', overflowWrap: 'break-word' }}
            dangerouslySetInnerHTML={{ __html: lesson.content }}
          />
        )}

        {/* Attachments - show only if attachments exist and additional_files don't, or if both exist, prefer attachments */}
        {lesson.attachments && lesson.attachments.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Prilozi
            </h3>
            <div className="space-y-4">
              {lesson.attachments.map((attachment, index) => {
                const fileUrl = attachment.file_path?.startsWith('http') 
                  ? attachment.file_path 
                  : attachment.file_path?.startsWith('/storage/')
                  ? attachment.file_path
                  : `/storage/${attachment.file_path}`;
                
                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl || '');
                const isPdf = /\.pdf$/i.test(fileUrl || '');
                const fileName = attachment.file_name || fileUrl?.split('/').pop() || 'File';

                return (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    {isImage && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-800">
                        <img
                          src={fileUrl}
                          alt={fileName}
                          className="w-full max-h-96 object-contain rounded"
                        />
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center">
                          {fileName}
                        </p>
                      </div>
                    )}
                    {isPdf && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-800">
                        <iframe
                          src={fileUrl}
                          className="w-full h-96 rounded border border-gray-300 dark:border-gray-600"
                          title={fileName}
                        />
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {fileName}
                          </p>
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Otvori u novom prozoru
                          </a>
                        </div>
                      </div>
                    )}
                    {!isImage && !isPdf && (
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <div className="flex items-center gap-3">
                          <FiFile className="w-6 h-6 text-gray-500" />
                          <span className="text-gray-900 dark:text-white">{fileName}</span>
                        </div>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Additional files from additional_files array - show only if attachments don't exist */}
        {(!lesson.attachments || lesson.attachments.length === 0) && lesson.additional_files && Array.isArray(lesson.additional_files) && lesson.additional_files.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Dodatni fajlovi
            </h3>
            <div className="space-y-4">
              {lesson.additional_files.map((file, index) => {
                let fileUrl = '';
                if (typeof file === 'string') {
                  // If it's already a full URL, use it
                  if (file.startsWith('http://') || file.startsWith('https://')) {
                    fileUrl = file;
                  } 
                  // If it starts with /storage/, use it as is
                  else if (file.startsWith('/storage/')) {
                    fileUrl = file;
                  }
                  // If it's a storage path without leading slash, add it
                  else if (file.startsWith('storage/')) {
                    fileUrl = '/' + file;
                  }
                  // Otherwise, assume it's a storage path
                  else {
                    fileUrl = `/storage/${file}`;
                  }
                } else {
                  fileUrl = (file as any)?.file_path || (file as any)?.url || '';
                }
                
                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl || '');
                const isPdf = /\.pdf$/i.test(fileUrl || '');
                const fileName = typeof file === 'string' 
                  ? file.split('/').pop() || 'File'
                  : (file as any)?.file_name || (file as any)?.name || 'File';

                if (!fileUrl) {
                  console.warn('⚠️ File URL is empty for file:', file);
                  return null;
                }
                
                console.log('📎 Processing file:', { file, fileUrl, isImage, isPdf, fileName });

                return (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    {isImage && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-800">
                        <img
                          src={fileUrl}
                          alt={fileName}
                          className="w-full max-h-96 object-contain rounded"
                        />
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center">
                          {fileName}
                        </p>
                      </div>
                    )}
                    {isPdf && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-800">
                        <iframe
                          src={fileUrl}
                          className="w-full h-96 rounded border border-gray-300 dark:border-gray-600"
                          title={fileName}
                        />
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {fileName}
                          </p>
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Otvori u novom prozoru
                          </a>
                        </div>
                      </div>
                    )}
                    {!isImage && !isPdf && (
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <div className="flex items-center gap-3">
                          <FiFile className="w-6 h-6 text-gray-500" />
                          <span className="text-gray-900 dark:text-white">{fileName}</span>
                        </div>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div>
            {isCompleted && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <FiCheckCircle className="w-5 h-5" />
                <span className="font-semibold">Završeno</span>
              </div>
            )}
          </div>
          {!isCompleted && (
            <button
              onClick={handleComplete}
              disabled={completing}
              className="btn-primary flex items-center gap-2"
            >
              <FiCheckCircle className="w-4 h-4" />
              {completing ? 'Završavanje...' : 'Završi lekciju'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}




