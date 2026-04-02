/** The same 21-joint skeleton pose as the camera overlay: index out, thumb up. */
export function gestureTutorialMarkup() {
  const fingers = [
    [[260, 162], [201, 78], [121, 62], [73, 56], [15, 50]],
    [[260, 162], [207, 107], [87, 121], [104, 135], [139, 132]],
    [[260, 162], [215, 135], [101, 160], [129, 162], [166, 149]],
    [[260, 162], [223, 161], [126, 188], [151, 185], [186, 176]],
  ];
  const thumb = [[260, 162], [199, 108], [190, 65], [186, 39], [183, 13]];
  const joints = (points: number[][]) => points.map(([x, y], i) =>
    `<circle cx="${x}" cy="${y}" r="${i === points.length - 1 ? 4 : 2.7}"/>`).join('');
  const bones = (points: number[][]) => `<polyline points="${points.map(p => p.join(',')).join(' ')}"/>`;
  return `<figure class="gesture-tutorial">
    <svg viewBox="0 0 280 205" role="img" aria-label="Gun pointer pose: right index finger extended sideways, thumb raised, other three fingers curled. Flick your thumb to select.">
      <g fill="none" stroke="#8ecaff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        ${fingers.map(bones).join('')}
        <polyline points="201,78 207,107 215,135 223,161"/>
        <path d="M260 162 L199 108"/><g class="demo-thumb">${bones(thumb.slice(1))}<g fill="#8ecaff" stroke="none">${joints(thumb.slice(1))}</g></g>
        <g fill="#8ecaff" stroke="none">${fingers.map(points => joints(points.slice(1))).join('')}<circle cx="260" cy="162" r="2.7"/></g>
      </g>
      <path class="demo-confirm" d="M168 16 Q145 32 166 50 M158 44 L166 50 L167 40" fill="none" stroke="#ffe81f" stroke-width="2" stroke-linecap="round"/>
    </svg>
    <figcaption>INDEX OUT · THUMB UP<br>POINT + THUMB FLICK</figcaption>
  </figure>`;
}
