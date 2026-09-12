import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Collection = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/school-admin/fees/collect', { replace: true });
  }, [navigate]);
  return null;
};

export default Collection;
