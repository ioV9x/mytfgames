export interface LocalGameViewProps {
  gameId: string;
}
export default function LocalGameView({ gameId }: LocalGameViewProps) {
  return <div>{gameId}</div>;
}
