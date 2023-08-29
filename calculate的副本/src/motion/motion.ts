import { mathjs } from "../lib/math";
import { BigNumber } from "mathjs";
let { bignumber } = mathjs

export default class Motion {

    env: Environment;

    angle: BigNumber;

    time: number;

    E_mea: BigNumber = bignumber(1);

    constructor(value: MotionMessage['value'], env: Environment, time: number) {
        this.angle = bignumber(value.alpha)
        this.env = env
        this.time = time
    }
}
