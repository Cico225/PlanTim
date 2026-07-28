import { useEffect, useState } from 'react';

interface AuthenticatedImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}

export default function AuthenticatedImage({
  src,
  alt,
  className = 'h-full w-full object-cover',
  fallbackClassName = 'flex aspect-[4/3] items-center justify-center bg-gray-50 text-sm text-gray-400 dark:bg-dark-900/40',
}: AuthenticatedImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    const load = async () => {
      if (!src) {
        setLoading(false);
        setImageUrl(null);
        return;
      }

      try {
        setLoading(true);
        setError(false);
        const token = localStorage.getItem('token');
        const fullUrl = src.startsWith('http') ? src : `${window.location.origin}${src}`;
        const response = await fetch(fullUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          throw new Error('Failed to load image');
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setImageUrl(objectUrl);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setImageUrl(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  if (!src) {
    return <div className={fallbackClassName}>Nema slike</div>;
  }

  if (loading) {
    return (
      <div className={fallbackClassName}>
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !imageUrl) {
    return <div className={fallbackClassName}>Greška pri učitavanju</div>;
  }

  return <img src={imageUrl} alt={alt} className={className} />;
}
