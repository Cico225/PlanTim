import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiPlus, FiTrash2, FiUpload, FiX, FiImage, FiFile } from 'react-icons/fi';
import { lmsService, Lesson } from '@/services/lmsService';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';

export default function LessonForm() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const isEdit = !!lessonId;

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<number, boolean>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [filePreviews, setFilePreviews] = useState<Record<number, { url: string; type: string; name: string }>>({});
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRefs = useRef<Record<number, HTMLInputElement>>({});
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    video_url: '',
    image_url: '',
    duration: '',
    order: '1',
    is_published: true, // Default to published so lessons are visible
    additional_files: [] as string[],
  });

  useEffect(() => {
    if (isEdit && courseId && lessonId) {
      loadLesson();
    }
    if (!isEdit && courseId) {
      // Set default order to next available
      loadNextOrder();
    }
  }, [courseId, lessonId, isEdit]);

  const loadLesson = async () => {
    try {
      const lesson = await lmsService.getLesson(Number(courseId), Number(lessonId));
      setFormData({
        title: lesson.title || '',
        description: lesson.description || '',
        content: lesson.content || '',
        video_url: lesson.video_url || '',
        image_url: lesson.image_url || '',
        duration: lesson.duration?.toString() || '',
        order: lesson.order?.toString() || '1',
        is_published: lesson.is_published || false,
        additional_files: lesson.additional_files || [],
      });
      
      // Set image preview if image_url exists
      if (lesson.image_url) {
        setImagePreview(lesson.image_url);
      }
      
      // Set file previews if additional_files exist
      if (lesson.additional_files && lesson.additional_files.length > 0) {
        const previews: Record<number, { url: string; type: string; name: string }> = {};
        lesson.additional_files.forEach((file, index) => {
          if (typeof file === 'string') {
            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file);
            const isPdf = /\.pdf$/i.test(file);
            previews[index] = {
              url: file,
              type: isImage ? 'image' : isPdf ? 'pdf' : 'other',
              name: file.split('/').pop() || 'File',
            };
          }
        });
        setFilePreviews(previews);
      }
    } catch (error: any) {
      console.error('Failed to load lesson:', error);
      toast.error('Neuspješno učitavanje lekcije');
    }
  };

  const loadNextOrder = async () => {
    try {
      const lessons = await lmsService.getLessons(Number(courseId));
      const nextOrder = lessons.length > 0 ? Math.max(...lessons.map(l => l.order || 0)) + 1 : 1;
      setFormData({ ...formData, order: nextOrder.toString() });
    } catch (error) {
      // Ignore error, use default
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Naslov lekcije je obavezan');
      return;
    }

    try {
      setLoading(true);
      
      // Filter out empty strings from additional_files
      const filteredAdditionalFiles = formData.additional_files.filter(file => file && file.trim() !== '');
      
      const submitData = {
        ...formData,
        additional_files: filteredAdditionalFiles.length > 0 ? filteredAdditionalFiles : undefined,
        duration: formData.duration ? parseInt(formData.duration) : undefined,
        order: parseInt(formData.order),
      };

      console.log('📤 Submitting lesson data:', {
        image_url: submitData.image_url,
        additional_files: submitData.additional_files,
        filteredCount: filteredAdditionalFiles.length,
      });

      if (isEdit && lessonId) {
        // Update would go here if we add update endpoint
        toast.success('Ažuriranje lekcije će biti dodato');
      } else {
        await lmsService.createLesson(Number(courseId), submitData);
        toast.success('Lekcija uspješno kreirana');
      }
      
      navigate(`/lms/courses/${courseId}`);
    } catch (error: any) {
      console.error('Failed to save lesson:', error);
      toast.error('Neuspješno čuvanje lekcije');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFile = () => {
    setFormData({
      ...formData,
      additional_files: [...formData.additional_files, ''],
    });
  };

  const handleFileChange = (index: number, value: string) => {
    const newFiles = [...formData.additional_files];
    newFiles[index] = value;
    setFormData({ ...formData, additional_files: newFiles });
    
    // Set preview if URL is provided
    if (value && value.trim()) {
      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(value);
      const isPdf = /\.pdf$/i.test(value);
      setFilePreviews({
        ...filePreviews,
        [index]: {
          url: value,
          type: isImage ? 'image' : isPdf ? 'pdf' : 'other',
          name: value.split('/').pop() || 'File',
        },
      });
    } else {
      const newPreviews = { ...filePreviews };
      delete newPreviews[index];
      setFilePreviews(newPreviews);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Molimo odaberite sliku');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Slika ne smije biti veća od 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      setUploadingImage(true);
      const uploadFormData = new FormData();
      uploadFormData.append('image', file);

      const response = await apiService.upload<{ url: string; path: string; filename: string }>(
        '/lms/lessons/upload-image',
        uploadFormData
      );

      setFormData({ ...formData, image_url: response.url });
      toast.success('Slika uspješno učitana');
    } catch (error: any) {
      console.error('Failed to upload image:', error);
      toast.error(error.response?.data?.error || 'Neuspješno učitavanje slike');
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, image_url: '' });
    setImagePreview(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (!isImage && !isPdf) {
      toast.error('Molimo odaberite sliku ili PDF fajl');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Fajl ne smije biti veći od 10MB');
      return;
    }

    try {
      setUploadingFiles({ ...uploadingFiles, [index]: true });
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await apiService.upload<{ url: string; path: string; filename: string; file_type: string }>(
        '/lms/lessons/upload-file',
        uploadFormData
      );

      const newFiles = [...formData.additional_files];
      newFiles[index] = response.url;
      setFormData({ ...formData, additional_files: newFiles });

      setFilePreviews({
        ...filePreviews,
        [index]: {
          url: response.url,
          type: response.file_type,
          name: response.filename,
        },
      });

      toast.success('Fajl uspješno učitán');
    } catch (error: any) {
      console.error('Failed to upload file:', error);
      toast.error(error.response?.data?.error || 'Neuspješno učitavanje fajla');
    } finally {
      setUploadingFiles({ ...uploadingFiles, [index]: false });
      if (fileInputRefs.current[index]) {
        fileInputRefs.current[index].value = '';
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = formData.additional_files.filter((_, i) => i !== index);
    setFormData({ ...formData, additional_files: newFiles });
    
    const newPreviews = { ...filePreviews };
    delete newPreviews[index];
    // Reindex previews
    const reindexedPreviews: Record<number, { url: string; type: string; name: string }> = {};
    Object.keys(newPreviews).forEach((key) => {
      const oldIndex = parseInt(key);
      if (oldIndex > index) {
        reindexedPreviews[oldIndex - 1] = newPreviews[oldIndex];
      } else {
        reindexedPreviews[oldIndex] = newPreviews[oldIndex];
      }
    });
    setFilePreviews(reindexedPreviews);
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6 max-w-full overflow-x-hidden">
      <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate(`/lms/courses/${courseId}`)}
        className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
      >
        <FiArrowLeft className="w-4 h-4" />
        Nazad na kurs
      </button>

      <div className="card p-4 sm:p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          {isEdit ? 'Uredi lekciju' : 'Nova lekcija'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Osnovne informacije
            </h2>

            <div>
              <label className="label">Naslov lekcije *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input"
                required
                placeholder="Unesite naslov lekcije"
              />
            </div>

            <div>
              <label className="label">Opis</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input"
                rows={3}
                placeholder="Kratak opis lekcije"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Redoslijed *</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                  className="input"
                  required
                  min="1"
                />
              </div>

              <div>
                <label className="label">Trajanje (minute)</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="input"
                  min="0"
                  placeholder="Npr. 30"
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Sadržaj
            </h2>

            <div>
              <label className="label">Video URL</label>
              <input
                type="url"
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                className="input"
                placeholder="https://youtube.com/watch?v=... ili embed URL"
              />
            </div>

            <div>
              <label className="label">Slika</label>
              
              {/* Image Preview */}
              {(formData.image_url || imagePreview) && (
                <div className="mb-4 relative">
                  <img
                    src={imagePreview || formData.image_url}
                    alt="Lesson preview"
                    className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    title="Ukloni sliku"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Upload Button */}
              <div className="flex gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="btn-secondary flex items-center gap-2"
                >
                  <FiUpload className="w-4 h-4" />
                  {uploadingImage ? 'Učitavanje...' : 'Učitaj sliku'}
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {/* URL Input (Alternative) */}
              <div>
                <label className="label text-sm text-gray-600 dark:text-gray-400">
                  Ili unesite URL slike:
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => {
                    const url = e.target.value;
                    setFormData({ ...formData, image_url: url });
                    if (url && url.trim()) {
                      setImagePreview(url);
                    } else {
                      setImagePreview(null);
                    }
                  }}
                  className="input"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            <div>
              <label className="label">Tekstualni sadržaj (HTML)</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="input"
                rows={10}
                placeholder="Unesite HTML sadržaj lekcije..."
              />
            </div>
          </div>

          {/* Additional Files */}
          <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Dodatni fajlovi
              </h2>
              <button
                type="button"
                onClick={handleAddFile}
                className="btn-secondary text-sm flex items-center gap-2"
              >
                <FiPlus className="w-4 h-4" />
                Dodaj fajl
              </button>
            </div>

            {formData.additional_files.map((file, index) => {
              const preview = filePreviews[index];
              return (
                <div key={index} className="space-y-2">
                  {/* File Preview */}
                  {preview && (
                    <div className="relative border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                      {preview.type === 'image' && (
                        <img
                          src={preview.url}
                          alt={preview.name}
                          className="w-full max-h-48 object-contain rounded"
                        />
                      )}
                      {preview.type === 'pdf' && (
                        <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded">
                          <FiFile className="w-8 h-8 text-red-500" />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">{preview.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">PDF dokument</p>
                          </div>
                          <a
                            href={preview.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary text-sm"
                          >
                            Otvori
                          </a>
                        </div>
                      )}
                      {preview.type === 'other' && (
                        <div className="flex items-center gap-3">
                          <FiFile className="w-6 h-6 text-gray-500" />
                          <span className="text-gray-900 dark:text-white">{preview.name}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* File Input Row */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[index]?.click()}
                      disabled={uploadingFiles[index]}
                      className="btn-secondary flex items-center gap-2 whitespace-nowrap"
                    >
                      <FiUpload className="w-4 h-4" />
                      {uploadingFiles[index] ? 'Učitavanje...' : 'Učitaj fajl'}
                    </button>
                    <input
                      ref={(el) => {
                        if (el) fileInputRefs.current[index] = el;
                      }}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload(index, e)}
                      className="hidden"
                    />
                    <input
                      type="url"
                      value={file}
                      onChange={(e) => handleFileChange(index, e.target.value)}
                      className="input flex-1"
                      placeholder="URL fajla ili kliknite 'Učitaj fajl' za lokalni upload"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                    >
                      <FiTrash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Settings */}
          <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Postavke
            </h2>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span className="text-gray-900 dark:text-white">Objavi lekciju</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => navigate(`/lms/courses/${courseId}`)}
              className="btn-secondary"
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              <FiSave className="w-4 h-4" />
              {loading ? 'Čuvanje...' : 'Sačuvaj'}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}




