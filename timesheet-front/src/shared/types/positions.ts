export interface positionType {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  facilities: {
    id: number;
    name: string;
  }[];
}
