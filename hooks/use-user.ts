import { useQuery } from '@tanstack/react-query';
import { getDocument } from '@/lib/firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';

interface UserProfile {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

export function useUser(uid: string | undefined) {
  return useQuery({
    queryKey: ['user', uid],
    queryFn: () => getDocument<UserProfile>(`${COLLECTIONS.USERS}/${uid}`),
    enabled: !!uid,
  });
}
