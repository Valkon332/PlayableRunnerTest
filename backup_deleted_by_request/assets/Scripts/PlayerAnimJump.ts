import { Animation, AnimationClip, Component } from 'cc';
import { startRunLoop } from './PlayerAnimRun';

export function playJumpOnceThenRun(
  anim: Animation | null,
  jumpClipName: string,
  runClipName: string,
  host: Component,
  onJumpEnd: () => void
) {
  if (!anim) {
    return;
  }
  anim.play(jumpClipName);
  const st = anim.getState(jumpClipName);
  if (st) {
    st.wrapMode = AnimationClip.WrapMode.Normal;
  }
  const duration = st?.duration ?? 0.5;
  host.scheduleOnce(() => {
    startRunLoop(anim, runClipName);
    onJumpEnd();
  }, duration);
}
