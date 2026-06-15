import {
  _decorator,
  Animation,
  AnimationClip,
  Color,
  Component,
  Sprite,
  tween,
  Tween,
} from 'cc';
import { RunnerHealth } from './RunnerHealth';
import { RunnerAudioManager } from './RunnerAudioManager';

const { ccclass, property } = _decorator;

@ccclass('PlayerRunnerAnimator')
export class PlayerRunnerAnimator extends Component {
  @property({ type: Animation })
  public anim: Animation | null = null;

  @property({ type: RunnerHealth })
  public health: RunnerHealth | null = null;

  @property
  public idleClipName = 'PlayerIdle';

  @property
  public idlePlaybackSpeed = 1;

  @property
  public runClipName = 'PlayerRuns';

  @property
  public jumpClipName = 'PlayerJumps';

  @property({
    displayName: 'Jump Height',
    range: [0, 800, 5],
    slide: true,
  })
  public jumpHeight = 380;

  @property
  public jumpAirDuration = 0;

  @property
  public hitClipName = 'PlayerHit';

  @property
  public hitBlinkStepDuration = 0.08;

  private _gameplay = false;

  private _busy = false;

  private _jumpBaseY = 0;

  private _jumpMotion = false;

  private _jumpElapsed = 0;

  private _jumpAir = 0;

  private _hitSprite: Sprite | null = null;

  private _hitBaseColor: Color | null = null;

  onLoad() {
    if (!this.anim) {
      this.anim =
        this.getComponent(Animation) ||
        this.getComponentInChildren(Animation);
    }
    if (!this.health) {
      this.health = this.getComponent(RunnerHealth);
    }
    this._resolveHitSprite();
  }

  onDestroy() {
    this._stopHitColorTween();
  }

  start() {
    this.playIdle();
  }

  public enterGameplayRun() {
    if (!this.anim) {
      return;
    }
    this._gameplay = true;
    this._playClip(this.runClipName, true);
  }

  public playIdle() {
    if (!this.anim || this._gameplay) {
      return;
    }
    this._playClip(this.idleClipName, true);
  }

  public tryJump(): boolean {
    if (!this._gameplay || !this.anim || this._busy) {
      return false;
    }
    this._busy = true;
    const st = this.anim.getState(this.jumpClipName);
    const clipDur = st?.duration && st.duration > 0 ? st.duration : 0.45;
    const air =
      this.jumpAirDuration > 0 ? this.jumpAirDuration : clipDur;
    const p = this.node.position;
    this._jumpBaseY = p.y;
    this._jumpElapsed = 0;
    this._jumpAir = Math.max(0.001, air);
    this._jumpMotion = this.jumpHeight > 0;
    RunnerAudioManager.inst?.playJump();
    this._playClip(this.jumpClipName, false);
    const jst = this.anim.getState(this.jumpClipName);
    if (jst && jst.duration > 0) {
      jst.speed = jst.duration / this._jumpAir;
    }
    this.scheduleOnce(() => {
      if (jst) {
        jst.speed = 1;
      }
      this._snapJumpLand();
      this._busy = false;
      if (!this._canResumeRun()) {
        return;
      }
      this._playClip(this.runClipName, true);
    }, this._jumpAir);
    return true;
  }

  update(dt: number) {
    if (!this._jumpMotion) {
      return;
    }
    this._jumpElapsed += dt;
    let t = this._jumpElapsed / this._jumpAir;
    if (t > 1) {
      t = 1;
    }
    const p = this.node.position;
    const off = this.jumpHeight * 4 * t * (1 - t);
    this.node.setPosition(p.x, this._jumpBaseY + off, p.z);
  }

  private _snapJumpLand() {
    this._jumpMotion = false;
    const p = this.node.position;
    this.node.setPosition(p.x, this._jumpBaseY, p.z);
  }

  public stopRunToIdle() {
    if (!this.anim) {
      return;
    }
    this.unscheduleAllCallbacks();
    this._stopHitColorTween();
    this._resetHitColor();
    this._gameplay = false;
    this._busy = false;
    const landY = this._jumpMotion ? this._jumpBaseY : this.node.position.y;
    this._jumpMotion = false;
    const p = this.node.position;
    this.node.setPosition(p.x, landY, p.z);
    this._playClip(this.idleClipName, true);
    const st = this.anim.getState(this.idleClipName);
    if (st) {
      const s = this.idlePlaybackSpeed;
      st.speed = s > 0 ? s : 1;
    }
  }

  public playClipLoop(clipName: string) {
    if (!this.anim || !clipName) {
      return;
    }
    this.unscheduleAllCallbacks();
    this._stopHitColorTween();
    this._resetHitColor();
    this._gameplay = false;
    this._busy = false;
    const landY = this._jumpMotion ? this._jumpBaseY : this.node.position.y;
    this._jumpMotion = false;
    const p = this.node.position;
    this.node.setPosition(p.x, landY, p.z);
    let name = clipName;
    if (!this.anim.getState(name)) {
      name = this.idleClipName;
    }
    if (!name || !this.anim.getState(name)) {
      return;
    }
    this._playClip(name, true);
    if (name !== this.idleClipName) {
      const st = this.anim.getState(name);
      if (st) {
        const s = this.idlePlaybackSpeed;
        st.speed = s > 0 ? s : 1;
      }
    }
  }

  public playHitThenResume(onComplete?: () => void) {
    if (!this.anim) {
      onComplete?.();
      return;
    }
    this._busy = true;
    RunnerAudioManager.inst?.playHit();
    this._playHitColorTween();
    this._playClip(this.hitClipName, false);
    const st = this.anim.getState(this.hitClipName);
    if (!st) {
      this._busy = false;
      onComplete?.();
      return;
    }
    const window = this._hitBlinkTotalDuration();
    if (st.duration > 0) {
      st.speed = st.duration / window;
    } else {
      st.speed = 1;
    }
    this.scheduleOnce(() => {
      st.speed = 1;
      this._busy = false;
      if (this._canResumeRun()) {
        this._playClip(this.runClipName, true);
      }
      onComplete?.();
    }, window);
  }

  private _resolveHitSprite() {
    const idle = this.node.getChildByName('PlayerIdle');
    if (idle?.isValid) {
      this._hitSprite = idle.getComponent(Sprite);
    }
    if (!this._hitSprite) {
      this._hitSprite = this.getComponentInChildren(Sprite);
    }
    if (this._hitSprite?.isValid) {
      this._hitBaseColor = this._hitSprite.color.clone();
    }
  }

  private _resetHitColor() {
    if (!this._hitSprite?.isValid) {
      this._resolveHitSprite();
    }
    if (this._hitSprite?.isValid && this._hitBaseColor) {
      this._hitSprite.color = this._hitBaseColor.clone();
    }
  }

  private _stopHitColorTween() {
    if (this._hitSprite?.isValid) {
      Tween.stopAllByTarget(this._hitSprite);
    }
  }

  private _playHitColorTween() {
    if (!this._hitSprite?.isValid) {
      this._resolveHitSprite();
    }
    const sprite = this._hitSprite;
    if (!sprite?.isValid) {
      return;
    }
    if (!this._hitBaseColor) {
      this._hitBaseColor = sprite.color.clone();
    }
    const white = this._hitBaseColor.clone();
    const red = new Color(255, 0, 0, white.a);
    const step = Math.max(0.001, this.hitBlinkStepDuration);
    this._stopHitColorTween();
    this._resetHitColor();
    tween(sprite)
      .to(step, { color: red })
      .to(step, { color: white })
      .to(step, { color: red })
      .to(step, { color: white })
      .call(() => this._resetHitColor())
      .start();
  }

  private _hitBlinkTotalDuration(): number {
    return Math.max(0.001, this.hitBlinkStepDuration) * 4;
  }

  private _canResumeRun(): boolean {
    return (
      !!this._gameplay &&
      !!this.anim &&
      (!this.health || this.health.isAlive)
    );
  }

  private _playClip(name: string, loop: boolean) {
    if (!this.anim || !name) {
      return;
    }
    const state = this.anim.getState(name);
    if (!state) {
      return;
    }
    state.wrapMode = loop
      ? AnimationClip.WrapMode.Loop
      : AnimationClip.WrapMode.Normal;
    if (name === this.idleClipName) {
      const s = this.idlePlaybackSpeed;
      state.speed = s > 0 ? s : 1;
    } else {
      state.speed = 1;
    }
    this.anim.play(name);
  }
}
