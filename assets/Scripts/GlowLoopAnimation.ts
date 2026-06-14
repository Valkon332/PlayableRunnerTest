import { _decorator, Animation, AnimationClip, Component } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('GlowLoopAnimation')
export class GlowLoopAnimation extends Component {
  @property({ type: Animation })
  public anim: Animation | null = null;

  @property
  public clipName = '';

  @property
  public playbackSpeed = 1;

  onLoad() {
    if (!this.anim) {
      this.anim =
        this.getComponent(Animation) ||
        this.getComponentInChildren(Animation);
    }
  }

  start() {
    if (!this.anim) {
      return;
    }
    const name = this.clipName.trim();
    if (!name) {
      const first = this.anim.clips[0];
      if (!first) {
        return;
      }
      this._playLoop(first.name);
      return;
    }
    this._playLoop(name);
  }

  private _playLoop(name: string) {
    if (!this.anim) {
      return;
    }
    const state = this.anim.getState(name);
    if (!state) {
      return;
    }
    state.wrapMode = AnimationClip.WrapMode.Loop;
    const s = this.playbackSpeed;
    state.speed = s > 0 ? s : 1;
    this.anim.play(name);
  }
}
