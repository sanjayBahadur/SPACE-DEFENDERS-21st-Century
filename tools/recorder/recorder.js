const start = document.querySelector('#start');
const stop = document.querySelector('#stop');
const status = document.querySelector('#status');
const duration = document.querySelector('#duration');
const fps = document.querySelector('#fps');
const videoOnly = document.querySelector('#video-only');
let run;

async function api(path, body, type = 'application/json') {
    const response = await fetch(`/capture-api/${path}`, { method: 'POST', headers: { 'Content-Type': type }, body: type === 'application/json' ? JSON.stringify(body) : body });
    if (!response.ok) throw new Error('The local recorder could not save this clip. Keep the terminal open.');
    return response.json();
}
function idle() { start.disabled = false; stop.disabled = true; duration.disabled = fps.disabled = videoOnly.disabled = false; }
function end() { if (run?.recorder.state === 'recording') run.recorder.stop(); }
start.addEventListener('click', async () => {
    start.disabled = true;
    duration.disabled = fps.disabled = videoOnly.disabled = true;
    let stream;
    let pendingSession;
    try {
        status.textContent = 'Choose the game browser tab and turn on tab audio in the sharing dialog.';
        stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'browser', frameRate: { ideal: Number(fps.value), max: Number(fps.value) }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: true, selfBrowserSurface: 'exclude', surfaceSwitching: 'exclude', systemAudio: 'include' });
        const hasAudio = stream.getAudioTracks().length > 0;
        if (!hasAudio && !videoOnly.checked) throw new Error('No game audio was shared. Choose the game tab with tab audio enabled, or allow video-only capture.');
        const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(type => MediaRecorder.isTypeSupported(type));
        if (!mimeType) throw new Error('This browser cannot record a supported video format. Try Chrome or Chromium.');
        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 12000000, audioBitsPerSecond: 192000 });
        const session = await api('start', { mimeType: recorder.mimeType });
        pendingSession = session;
        const settings = stream.getVideoTracks()[0].getSettings();
        const current = { recorder, stream, session, queue: Promise.resolve(), failure: null, started: performance.now(), timer: undefined, limit: undefined };
        run = current;
        recorder.addEventListener('dataavailable', event => {
            if (!event.data.size) return;
            current.queue = current.queue.then(() => {
                if (!current.failure) return api(`${session.id}/chunk`, event.data, 'application/octet-stream');
            }).catch(error => { current.failure = error; end(); });
        });
        recorder.addEventListener('error', () => { current.failure = new Error('Recording failed; the saved clip may be partial.'); end(); });
        recorder.addEventListener('stop', async () => {
            clearInterval(current.timer); clearTimeout(current.limit);
            stream.getTracks().forEach(track => track.stop());
            stop.disabled = true; status.textContent = 'Saving the recording…';
            try {
                await current.queue;
                const saved = await api(`${session.id}/finish`, { ...settings, hasAudio, mimeType: recorder.mimeType, durationSeconds: (performance.now() - current.started) / 1000, partial: !!current.failure });
                if (saved.discarded) status.textContent = 'No video was captured. You can try again.';
                else {
                    const item = document.createElement('p');
                    const link = document.createElement('a'); link.href = saved.url; link.textContent = saved.path; link.target = '_blank'; link.rel = 'noopener';
                    item.append(link); document.querySelector('#saved').append(item);
                    status.textContent = `${current.failure ? 'Partial clip saved' : 'Saved'}: ${saved.path}${hasAudio ? '\nGame audio included.' : '\nVideo only.'}`;
                }
            } catch (error) { status.textContent = error.message; }
            finally { if (run === current) run = undefined; idle(); }
        });
        stream.getVideoTracks()[0].addEventListener('ended', end, { once: true });
        recorder.start(1000);
        stop.disabled = false;
        const report = () => { status.textContent = `RECORDING · ${Math.floor((performance.now() - current.started) / 1000)} seconds\nSwitch to the game and play. ${hasAudio ? 'Game audio is included.' : 'Video only.'}\nStop & save here, or use the browser’s Stop sharing control.`; };
        current.timer = setInterval(report, 1000); report();
        current.limit = setTimeout(end, Number(duration.value) * 1000);
        if (stream.getVideoTracks()[0].readyState === 'ended') end();
    } catch (error) {
        if (pendingSession && (!run || run.recorder.state === 'inactive')) {
            await api(`${pendingSession.id}/finish`, {}).catch(() => {});
            run = undefined;
        }
        stream?.getTracks().forEach(track => track.stop());
        status.textContent = error.name === 'NotAllowedError' ? 'Sharing was cancelled. Choose Start recording to try again.' : error.message;
        idle();
    }
});
stop.addEventListener('click', end);
window.addEventListener('beforeunload', event => {
    if (run) { event.preventDefault(); event.returnValue = ''; }
});
if (!navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === 'undefined') {
    start.disabled = true;
    status.textContent = 'Screen capture is unavailable here. Open this local recorder in Chrome or Chromium.';
}
