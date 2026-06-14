import { _decorator, Component } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('RunnerHealth')
export class RunnerHealth extends Component {
  @property
  public maxHp = 3;

  private _hp = 3;

  onLoad() {
    this._hp = this.maxHp;
  }

  public resetHp() {
    this._hp = this.maxHp;
  }

  public get hp(): number {
    return this._hp;
  }

  public get isAlive(): boolean {
    return this._hp > 0;
  }

  public takeDamage(amount = 1): boolean {
    if (!this.isAlive || amount <= 0) {
      return false;
    }
    this._hp -= amount;
    if (this._hp < 0) {
      this._hp = 0;
    }
    return true;
  }
}
