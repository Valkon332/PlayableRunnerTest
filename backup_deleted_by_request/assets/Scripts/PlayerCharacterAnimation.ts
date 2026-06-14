import { _decorator, Component, Animation, input, Input, KeyCode, EventKeyboard } from 'cc';
import { startIdleLoop } from './PlayerAnimIdle';
import { startRunLoop } from './PlayerAnimRun';
import { playJumpOnceThenRun } from './PlayerAnimJump';

const { ccclass, property } = _decorator;

@ccclass('PlayerCharacterAnimation')
export class PlayerCharacterAnimation extends Component {
  @property({ type: Animation })
  public anim: Animation | null = null;

  @property
  public idleClipName = 'PlayerIdle';

  @property
  public runClipName = 'PlayerRuns';

  @property
  public jumpClipName = 'PlayerJumps';

  private _gameplay = false;
  private _jumping = false;

  onLoad() {
    if (!this.anim) {
      this.anim = this.getComponent(Animation);
    }
  }

  start() {
    if (!this.anim) {
      return;
    }
    startIdleLoop(this.anim, this.idleClipName);
    input.on(Input.EventType.KEY_DOWN, this._onKeyDown, this);
  }

  onDestroy() {
    input.off(Input.EventType.KEY_DOWN, this._onKeyDown, this);
  }

  public beginGameplay() {
    if (!this.anim) {
      return;
    }
    this._gameplay = true;
    startRunLoop(this.anim, this.runClipName);
  }

  public tryJump() {
    if (!this._gameplay || !this.anim || this._jumping) {
      return;
    }
    this._jumping = true;
    playJumpOnceThenRun(
      this.anim,
      this.jumpClipName,
      this.runClipName,
      this,
      () => {
        this._jumping = false;
      }
    );
  }

  private _onKeyDown(e: EventKeyboard) {
    if (e.keyCode !== KeyCode.SPACE) {
      return;
    }
    this.tryJump();
  }
}
