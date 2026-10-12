import type Phaser from 'phaser';
import { canvasBounds } from './GestureMenu';
import { handPoseMarkup } from './handPoses';

export function stationGuideMarkup(role: 'pilot' | 'gunner'): string {
    const pilot = role === 'pilot';
    return `<section class="station-guide" data-station="${role}" aria-label="${pilot ? 'Pilot left hand' : 'Gunner right hand'} instructions">
        <h2>${pilot ? 'PILOT · LEFT HAND' : 'GUNNER · RIGHT HAND'}</h2>
        <figure>${handPoseMarkup(pilot ? 'grab' : 'pointer')}
            <figcaption>${pilot ? 'FIST: GRAB THE SHIP<br>MOVE YOUR HAND TO FLY' : 'INDEX: AIM · THUMB: FIRE<br>POINT + FLICK FOR MENUS'}</figcaption>
        </figure>
        <figure>${handPoseMarkup(pilot ? 'release' : 'cannon')}
            <figcaption>${pilot ? 'OPEN PALM: RELEASE<br>LET THE SHIP DRIFT' : 'FIST: LASER CANNON<br>RELEASE TO COOL'}</figcaption>
        </figure>
    </section>`;
}

/** Match the pause canvas, including its FIT scale and letterboxed position. */
export function mountPauseGuides(scene: Phaser.Scene): void {
    const overlay = document.createElement('aside');
    overlay.className = 'pause-gesture-guides';
    overlay.setAttribute('aria-label', 'Pilot and Gunner gesture reference');
    overlay.innerHTML = stationGuideMarkup('pilot') + stationGuideMarkup('gunner');
    document.body.appendChild(overlay);
    const panels = [...overlay.querySelectorAll<HTMLElement>('.station-guide')];
    const layout = () => panels.forEach((panel, index) => {
        const bounds = canvasBounds(scene, { x: index === 0 ? 16 : 1000, y: 290, width: 264, height: 350 });
        panel.style.transform = `translate(${bounds.x}px, ${bounds.y}px) scale(${bounds.width / 264})`;
    });
    layout();
    scene.scale.on('resize', layout);
    scene.events.once('shutdown', () => {
        scene.scale.off('resize', layout);
        overlay.remove();
    });
}
