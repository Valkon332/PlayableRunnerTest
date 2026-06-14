import { _decorator, Component } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('RunnerObstacle')
export class RunnerObstacle extends Component {
  @property
  public damage = 1;

  @property
  public activeDamage = true;

  @property
  public damageSourceId = '';

  @property
  public oneHitPerEncounter = false;

  @property
  public rearmSeparationSec = 0.35;

  @property({
    displayName: 'Hit Inset X',
    range: [0, 0.45, 0.01],
    slide: true,
  })
  public hitInsetX = 0;

  @property({
    displayName: 'Hit Inset Y',
    range: [0, 0.45, 0.01],
    slide: true,
  })
  public hitInsetY = 0;
}
