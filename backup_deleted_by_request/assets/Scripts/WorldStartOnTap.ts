import { _decorator, Component, Node, input, Input, UIOpacity } from 'cc';
import { RunnerWorld } from './RunnerWorld';
import { InfiniteHorizontalScroll } from './InfiniteHorizontalScroll';
import { PlayerCharacterAnimation } from './PlayerCharacterAnimation';

const { ccclass, property } = _decorator;

@ccclass('WorldStartOnTap')
export class WorldStartOnTap extends Component {
  @property({ type: RunnerWorld })
  public runnerWorld: RunnerWorld | null = null;

  @property({ type: InfiniteHorizontalScroll })
  public backgroundScroll: InfiniteHorizontalScroll | null = null;

  @property({ type: PlayerCharacterAnimation })
  public playerCharacterAnimation: PlayerCharacterAnimation | null = null;

  @property({ type: Node })
  public handNode: Node | null = null;

  @property({ type: Node })
  public handRoot: Node | null = null;

  private _started = false;

  onLoad() {
    if (this.runnerWorld) {
      this.runnerWorld.enabled = false;
    }
    if (this.backgroundScroll) {
      this.backgroundScroll.enabled = false;
    }
  }

  onEnable() {
    if (this._started) {
      return;
    }
    input.on(Input.EventType.TOUCH_END, this._onFirstInput, this);
    input.on(Input.EventType.MOUSE_UP, this._onFirstInput, this);
  }

  onDisable() {
    input.off(Input.EventType.TOUCH_END, this._onFirstInput, this);
    input.off(Input.EventType.MOUSE_UP, this._onFirstInput, this);
  }

  private _onFirstInput() {
    if (this._started) {
      return;
    }
    this._started = true;
    input.off(Input.EventType.TOUCH_END, this._onFirstInput, this);
    input.off(Input.EventType.MOUSE_UP, this._onFirstInput, this);
    if (this.runnerWorld) {
      this.runnerWorld.enabled = true;
    }
    if (this.backgroundScroll) {
      this.backgroundScroll.enabled = true;
    }
    if (this.playerCharacterAnimation) {
      this.playerCharacterAnimation.beginGameplay();
    }
    const hideTarget = this.handRoot ?? this.handNode;
    if (hideTarget && hideTarget.isValid) {
      this.scheduleOnce(() => this._hideNodeVisual(hideTarget), 0);
    }
  }

  private _hideNodeVisual(n: Node) {
    if (!n || !n.isValid) {
      return;
    }
    let op = n.getComponent(UIOpacity);
    if (!op) {
      op = n.addComponent(UIOpacity);
    }
    op.opacity = 0;
    n.active = false;
  }
}
