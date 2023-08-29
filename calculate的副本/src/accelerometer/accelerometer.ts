import { BigNumber, Matrix } from "mathjs";
import { mathjs } from "../lib/math";
const { matrix, bignumber } = mathjs

export default class Accelerometer {

    x: BigNumber;

    y: BigNumber;

    z: BigNumber;

    time: BigNumber;

    public get state(): Matrix {
        return matrix([
            [bignumber(this.x)],
            [bignumber(this.y)],
            // [bignumber(this.z)],
        ])
    }

    constructor({ x, y, z }: Acceleration, time: number | BigNumber) {
        this.x = bignumber(x)
        this.y = bignumber(y)
        this.z = bignumber(z)
        this.time = bignumber(time)
    }

    static createFromState(state: Matrix, time: number | BigNumber): Accelerometer {
        // return new this({ x: state.get([0, 0]), y: state.get([1, 0]), z: state.get([2, 0]) } as Acceleration, time)
        return new this({ x: state.get([0, 0]), y: state.get([1, 0]), z: 0 } as Acceleration, time)
    }
}