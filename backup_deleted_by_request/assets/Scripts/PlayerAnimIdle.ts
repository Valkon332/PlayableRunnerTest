import { Animation, AnimationClip } from 'cc';

export function startIdleLoop(anim: Animation | null, clipName: string) {
  if (!anim) {
    return;
  }
  anim.play(clipName);
  const st = anim.getState(clipName);
  if (st) {
    st.wrapMode = AnimationClip.WrapMode.Loop;
  }
}
