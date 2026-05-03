import { PITCH_SLIDES, COVER } from '@/lib/capstone';
import { PitchDeck } from '@/components/PitchDeck';

export const dynamic = 'force-static';

export const metadata = {
  title: 'Pitch deck',
  description: 'SentinelCloud capstone pitch. Fifteen slides, keyboard navigable.',
};

export default function PitchPage() {
  return <PitchDeck slides={PITCH_SLIDES} cover={COVER} />;
}
