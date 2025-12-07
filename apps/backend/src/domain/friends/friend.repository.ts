export type Friend = {
  id: string;
  userId: string;
  name: string;
  avatarUrl?: string | null;
};

export interface FriendRepository {
  listByUser(userId: string): Promise<Friend[]>;
}
