import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CreateProjectModal from './CreateProjectModal';
import { Project } from '@/services/projectsService';

export default function CreateProjectPage() {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate('/projects');
  };

  const handleProjectCreated = (project: Project) => {
    // Navigation is handled in the modal
  };

  return (
    <CreateProjectModal
      isOpen={true}
      onClose={handleClose}
      onProjectCreated={handleProjectCreated}
    />
  );
}
















