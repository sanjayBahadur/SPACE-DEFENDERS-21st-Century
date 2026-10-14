export type HandPose = 'grab' | 'release' | 'pointer' | 'cannon';

type Joint = readonly [number, number];
type Skeleton = readonly Joint[];

/** MediaPipe joint order: wrist, then thumb, index, middle, ring and little finger. */
const poses: Record<HandPose, { label: string; joints: Skeleton }> = {
  grab: {
    label: 'Pilot grab: curl the fingers into a closed hand to grab and move the ship.',
    joints: [
      [92, 220],
      [166, 193], [227, 137], [237, 76], [187, 43],
      [142, 89], [164, 42], [169, 101], [151, 108],
      [106, 93], [117, 51], [127, 118], [105, 120],
      [84, 101], [70, 70], [90, 124], [70, 124],
      [35, 99], [62, 84], [88, 114], [69, 131],
    ],
  },
  release: {
    label: 'Pilot release: spread all five fingers into an open palm to release the ship.',
    joints: [
      [122, 220],
      [173, 199], [209, 168], [229, 139], [242, 108],
      [172, 111], [180, 78], [187, 47], [191, 22],
      [129, 101], [131, 69], [132, 37], [133, 10],
      [87, 107], [84, 78], [83, 46], [82, 22],
      [46, 120], [41, 94], [37, 70], [33, 48],
    ],
  },
  pointer: {
    label: 'Gunner pointer: extend the index finger sideways, raise the thumb and curl the other fingers. Flick the thumb to fire or select.',
    joints: [
      [260, 179],
      [199, 125], [190, 82], [186, 56], [183, 30],
      [201, 95], [121, 79], [73, 73], [15, 67],
      [207, 124], [87, 138], [104, 152], [139, 149],
      [215, 152], [101, 177], [129, 179], [166, 166],
      [223, 178], [126, 205], [151, 202], [186, 193],
    ],
  },
  cannon: {
    label: 'Gunner laser cannon: curl all fingers into a sideways fist with the thumb tucked over the fingers.',
    joints: [
      [211, 204],
      [187, 175], [155, 128], [116, 81], [143, 81],
      [235, 59], [130, 74], [66, 50], [65, 87],
      [247, 111], [127, 121], [96, 121], [155, 120],
      [242, 163], [121, 157], [90, 163], [155, 150],
      [208, 192], [124, 198], [96, 187], [149, 174],
    ],
  },
};

const fingers = [[0, 1, 2, 3, 4], [0, 5, 6, 7, 8], [0, 9, 10, 11, 12],
  [0, 13, 14, 15, 16], [0, 17, 18, 19, 20], [5, 9, 13, 17]];
const fingertips = new Set([4, 8, 12, 16, 20]);

/** Code-native pose diagrams share the live overlay's blue bones and five bright fingertips. */
export function handPoseMarkup(pose: HandPose): string {
  const { label, joints } = poses[pose];
  const bones = fingers.map(indices => `<polyline points="${indices
    .map(index => joints[index].join(',')).join(' ')}"/>`).join('');
  const dots = joints.map(([x, y], index) => `<circle cx="${x}" cy="${y}" r="${
    fingertips.has(index) ? 5.8 : 2.8}" opacity="${fingertips.has(index) ? 1 : 0.65}"/>`).join('');
  return `<svg class="hand-pose hand-pose--${pose}" viewBox="0 0 280 240" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="#8ecaff" stroke-opacity="0.7" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${bones}</g>
    <g fill="#8ecaff">${dots}</g>
  </svg>`;
}
