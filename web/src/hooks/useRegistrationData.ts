import { useEffect, useState } from 'react';
import { Sector, Church, Team } from '@/integrations/type_def';
import { AdminBackOfficeServices } from '@/services/AdminBackOfficeServices';

export function useRegistrationData() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);

  useEffect(() => {
    const fetchSectors = async () => {
      const data = await AdminBackOfficeServices.fetchSectors();
      setSectors(data || []);
    };
    const fetchTeams = async () => {
      const data = await AdminBackOfficeServices.fetchTeams();
      setTeams(data || []);
    };
    const fetchChurches = async () => {
      const data = await AdminBackOfficeServices.fetchChurches();
      setChurches(data || []);
    };

    fetchSectors();
    fetchTeams();
    fetchChurches();
  }, []);

  return { teams, sectors, churches };
}
