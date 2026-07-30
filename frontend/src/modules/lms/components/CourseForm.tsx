import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiX, FiUpload, FiUsers, FiShield, FiImage } from 'react-icons/fi';
import { lmsService, Course } from '@/services/lmsService';
import { useAuthStore } from '@/store/authStore';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';
import CourseSurprisesTab from './CourseSurprisesTab';

interface UserOption {
  id: number;
  name: string;
  email: string;
}

interface RoleOption {
  id: number;
  name: string;
  display_name: string;
}

export default function CourseForm() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isEdit = !!courseId;

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    cover_image: '',
    video_intro_url: '',
    category: '',
    level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    duration: '',
    is_published: true, // Default to published so users can see it
    is_featured: false,
    attachments: [] as string[],
    user_groups: [] as Array<{ group_type: string; group_value: string }>,
  });

  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [selectedRoleNames, setSelectedRoleNames] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUsersAndRoles();
    if (isEdit && courseId) {
      loadCourse();
    }
  }, [courseId, isEdit]);

  const loadUsersAndRoles = async () => {
    setLoadingData(true);
    try {
      const data = await lmsService.getUsersAndRoles();
      setAvailableUsers(data.users || []);
      setAvailableRoles(data.roles || []);
    } catch (error: any) {
      console.error('Error fetching users and roles:', error);
      // Fallback to hardcoded roles if API fails
      setAvailableRoles([
        { id: 1, name: 'admin', display_name: 'Administrator' },
        { id: 2, name: 'manager', display_name: 'Manager' },
        { id: 3, name: 'employee', display_name: 'Zaposlenik' },
        { id: 4, name: 'user', display_name: 'Korisnik' },
      ]);
    } finally {
      setLoadingData(false);
    }
  };

  const loadCourse = async () => {
    try {
      const course = await lmsService.getCourse(Number(courseId));
      setFormData({
        title: course.title || '',
        description: course.description || '',
        cover_image: course.cover_image || '',
        video_intro_url: course.video_intro_url || '',
        category: course.category || '',
        level: course.level || 'beginner',
        duration: course.duration?.toString() || '',
        is_published: course.is_published || false,
        is_featured: course.is_featured || false,
        attachments: course.attachments || [],
        user_groups: course.user_groups || [],
      });
      
      // Set image preview if cover_image exists
      if (course.cover_image) {
        setImagePreview(course.cover_image);
      }
      
      // Extract selected roles and users from user_groups
      const roles: string[] = [];
      const userIds: number[] = [];
      (course.user_groups || []).forEach((group: any) => {
        if (group.group_type === 'role') {
          roles.push(group.group_value);
        } else if (group.group_type === 'user') {
          const userId = parseInt(group.group_value);
          if (!isNaN(userId)) {
            userIds.push(userId);
          }
        }
      });
      setSelectedRoleNames(roles);
      setSelectedUserIds(userIds);
    } catch (error: any) {
      console.error('Failed to load course:', error);
      toast.error('Neuspješno učitavanje kursa');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔄 Form submit started', { formData, isEdit, courseId });
    
    // Check if formData exists and has title
    if (!formData || !formData.title || !formData.title.trim()) {
      toast.error('Naslov kursa je obavezan');
      return;
    }

    try {
      setLoading(true);
      console.log('⏳ Loading started, preparing data...');
      
      // Build user_groups from selected roles and users
      const userGroups: Array<{ group_type: string; group_value: string }> = [];
      
      // Add selected roles
      selectedRoleNames.forEach(roleName => {
        userGroups.push({ group_type: 'role', group_value: roleName });
      });
      
      // Add selected users
      selectedUserIds.forEach(userId => {
        userGroups.push({ group_type: 'user', group_value: userId.toString() });
      });
      
      const submitData: any = {
        title: (formData.title || '').trim(),
        level: formData.level || 'beginner',
        is_published: formData.is_published !== undefined ? formData.is_published : true,
        is_featured: formData.is_featured !== undefined ? formData.is_featured : false,
      };

      // Add optional fields only if they have values
      if (formData.description?.trim()) {
        submitData.description = formData.description.trim();
      }
      if (formData.cover_image?.trim()) {
        submitData.cover_image = formData.cover_image.trim();
      }
      if (formData.video_intro_url?.trim()) {
        submitData.video_intro_url = formData.video_intro_url.trim();
      }
      if (formData.category?.trim()) {
        submitData.category = formData.category.trim();
      }
      if (formData.duration && formData.duration.trim() !== '') {
        const duration = parseInt(formData.duration);
        if (!isNaN(duration) && duration > 0) {
          submitData.duration = duration;
        }
      }
      if (formData.attachments && formData.attachments.length > 0) {
        submitData.attachments = formData.attachments;
      }
      if (userGroups.length > 0) {
        submitData.user_groups = userGroups;
      }

      console.log('📤 Submitting data:', submitData);

      if (isEdit && courseId) {
        console.log('✏️ Updating course:', courseId);
        await lmsService.updateCourse(Number(courseId), submitData);
        toast.success('Kurs uspješno ažuriran');
      } else {
        console.log('➕ Creating new course');
        const result = await lmsService.createCourse(submitData);
        console.log('✅ Course created:', result);
        toast.success('Kurs uspješno kreiran');
      }
      
      console.log('🚀 Navigating to /lms/manage');
      navigate('/lms/maloprodaja/manage');
    } catch (error: any) {
      console.error('❌ Failed to save course:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      // Detailed error logging
      if (error.response?.data) {
        console.error('Full error details:', JSON.stringify(error.response.data, null, 2));
      }
      
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.error
        || error.message
        || 'Neuspješno čuvanje kursa';
      
      if (error.response?.data?.errors) {
        // Validation errors
        const errors = error.response.data.errors;
        const firstError = Object.values(errors)[0];
        toast.error(Array.isArray(firstError) ? firstError[0] : String(firstError));
      } else {
        // Show detailed error in toast
        const detailedError = error.response?.data?.error || errorMessage;
        toast.error(typeof detailedError === 'string' ? detailedError : 'Neuspješno čuvanje kursa');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = (roleName: string) => {
    setSelectedRoleNames(prev => 
      prev.includes(roleName)
        ? prev.filter(r => r !== roleName)
        : [...prev, roleName]
    );
  };

  const handleUserToggle = (userId: number) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Molimo odaberite sliku');
      return;
    }

    // Validate file size (5MB)
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

    // Upload file
    try {
      setUploadingImage(true);
      const uploadFormData = new FormData();
      uploadFormData.append('image', file);

      const response = await apiService.upload<{ url: string; path: string; filename: string }>(
        '/lms/courses/upload-image',
        uploadFormData
      );

      setFormData({ ...formData, cover_image: response.url });
      toast.success('Slika uspješno učitana');
    } catch (error: any) {
      console.error('Failed to upload image:', error);
      toast.error(error.response?.data?.error || 'Neuspješno učitavanje slike');
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, cover_image: '' });
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6 max-w-full overflow-x-hidden">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/lms/maloprodaja/manage')}
          className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
        >
          <FiArrowLeft className="w-4 h-4" />
          Nazad
        </button>
      </div>

      <div className="card p-4 sm:p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          {isEdit ? 'Uredi kurs' : 'Novi kurs'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Osnovne informacije
            </h2>

            <div>
              <label className="label">Naslov kursa *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input"
                required
                placeholder="Unesite naslov kursa"
              />
            </div>

            <div>
              <label className="label">Opis</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input"
                rows={4}
                placeholder="Unesite opis kursa"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Kategorija</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input"
                >
                  <option value="">Izaberite kategoriju</option>
                  <option value="roba">Roba</option>
                  <option value="brendovi">Brendovi</option>
                  <option value="vizuelno_uredjenje">Vizuelno uređenje</option>
                  <option value="software">Software</option>
                  <option value="marketing">Marketing</option>
                  <option value="poslovne_procedure">Poslovne procedure</option>
                  <option value="ostalo">Ostalo</option>
                </select>
              </div>

              <div>
                <label className="label">Nivo *</label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value as any })}
                  className="input"
                  required
                >
                  <option value="beginner">Početnički</option>
                  <option value="intermediate">Srednji</option>
                  <option value="advanced">Napredni</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Trajanje (sati)</label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="input"
                min="0"
                placeholder="Npr. 10"
              />
            </div>
          </div>

          {/* Media */}
          <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Multimedijalni sadržaj
            </h2>

            <div>
              <label className="label">Cover slika</label>
              
              {/* Image Preview */}
              {(formData.cover_image || imagePreview) && (
                <div className="mb-4 relative">
                  <img
                    src={imagePreview || formData.cover_image}
                    alt="Cover preview"
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
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="btn-secondary flex items-center gap-2"
                >
                  <FiUpload className="w-4 h-4" />
                  {uploadingImage ? 'Učitavanje...' : 'Učitaj sliku'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {/* URL Input (Alternative) */}
              <div className="mt-3">
                <label className="label text-sm text-gray-600 dark:text-gray-400">
                  Ili unesite URL slike:
                </label>
                <input
                  type="url"
                  value={formData.cover_image}
                  onChange={(e) => {
                    const url = e.target.value;
                    setFormData({ ...formData, cover_image: url });
                    // Set preview if URL is provided
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
              <label className="label">Video uvod (URL)</label>
              <input
                type="url"
                value={formData.video_intro_url}
                onChange={(e) => setFormData({ ...formData, video_intro_url: e.target.value })}
                className="input"
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          </div>

          {/* Access Control - Roles & Users */}
          <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Ovlaštenja (pristup kursu)
            </h2>
            
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Ako nijedna rola ili korisnik nije odabran, kurs će biti dostupan svim korisnicima.
            </p>

            {/* Roles Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FiShield className="inline mr-1" />
                Role koje imaju pristup kursu
              </label>
              {loadingData ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Učitavanje rola...</div>
              ) : (
                <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 p-2">
                  {availableRoles.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400 p-2">Nema dostupnih rola</div>
                  ) : (
                    availableRoles.map((role) => (
                      <label
                        key={role.id}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRoleNames.includes(role.name)}
                          onChange={() => handleRoleToggle(role.name)}
                          disabled={loading}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {role.display_name || role.name}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Individual Users Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FiUsers className="inline mr-1" />
                Pojedinačni korisnici koji imaju pristup kursu
              </label>
              {loadingData ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Učitavanje korisnika...</div>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 p-2">
                  {availableUsers.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400 p-2">Nema dostupnih korisnika</div>
                  ) : (
                    availableUsers.map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user.id)}
                          onChange={() => handleUserToggle(user.id)}
                          disabled={loading}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {user.name} <span className="text-gray-500 dark:text-gray-400">({user.email})</span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Summary of selected */}
            {(selectedRoleNames.length > 0 || selectedUserIds.length > 0) && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Odabrano:</strong>{' '}
                  {selectedRoleNames.length > 0 && (
                    <span>{selectedRoleNames.length} {selectedRoleNames.length === 1 ? 'rola' : 'rola'}</span>
                  )}
                  {selectedRoleNames.length > 0 && selectedUserIds.length > 0 && ' i '}
                  {selectedUserIds.length > 0 && (
                    <span>{selectedUserIds.length} {selectedUserIds.length === 1 ? 'korisnik' : 'korisnika'}</span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Surprises */}
          {isEdit && courseId ? (
            <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Iznenađenja
              </h2>
              <CourseSurprisesTab courseId={Number(courseId)} />
            </div>
          ) : (
            <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Iznenađenja
              </h2>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Sačuvajte kurs prvo da biste mogli konfigurirati iznenađenja.
                </p>
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Postavke
            </h2>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <span className="text-gray-900 dark:text-white">Objavi kurs</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <span className="text-gray-900 dark:text-white">Istaknuti kurs</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => navigate('/lms/maloprodaja/manage')}
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

