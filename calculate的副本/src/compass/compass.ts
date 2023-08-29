import { BigNumber } from "mathjs";
import { mathjs } from "../lib/math";
let { bignumber } = mathjs

export default class Compass {

    env: Environment;

    accuracy: CompassData['accuracy'];

    angle: BigNumber = bignumber(0);

    time: number;

    public get E_mea(): BigNumber {
        let accuracy = bignumber(6)
        switch (this.env.system) {
            case 'Android':
                switch (this.accuracy) {
                    case 'high':
                        accuracy = bignumber(1)
                        break;
                    case 'medium':
                        accuracy = bignumber(2)
                        break;
                    case 'low':
                        accuracy = bignumber(3)
                        break;
                    case 'no-contact':
                        accuracy = bignumber(4)
                        break;
                    case 'unreliable':
                        accuracy = bignumber(5)
                        break;
                }
                break;
            case 'iOS':
                accuracy = bignumber(this.accuracy)
                break;
        }
        return accuracy.pow(2)
    }

    constructor({ direction, accuracy }: CompassData, env: Environment, time: number) {
        this.env = env
        this.accuracy = accuracy
        this.angle = bignumber(direction)
        this.time = time
    }

}
