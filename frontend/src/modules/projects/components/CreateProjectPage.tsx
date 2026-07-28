import { useNavigate } from 'react-router-dom';
import CreateProjectModal from './CreateProjectModal';

export default function CreateProjectPage() {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate('/projects/project-management');
  };

  return (
    <CreateProjectModal
      isOpen={true}
      onClose={handleClose}
      onProjectCreated={() => {
        // Navigation is handled in the modal
      }}
    />
  );
}
















