import { BigNumber, Matrix } from "mathjs";
import { mathjs } from "./math";
const { matrix, bignumber } = mathjs

export class Point {

    x: BigNumber;

    y: BigNumber;

    z: number = 0;

    floor: string;

    error: Matrix;

    covariance: Matrix; // 测量误差协方差

    time: BigNumber;

    public get vector(): Matrix {
        return matrix([
            [this.x],
            [this.y],
        ])
    }

    public get phalanx(): Matrix {
        return matrix([
            [this.x, 0],
            [0, this.y],
        ])
    }

    public get state(): Matrix {
        return matrix([
            [this.x],
            [this.y],
            [this.z],
        ])
    }

    public get content(): Record<string, any> {
        return {
            x: this.x.toNumber(),
            y: this.y.toNumber(),
            z: this.z,
            floor: this.floor
        }
    }

    constructor(data: { x: BigNumber | number, y: BigNumber | number, covariance?: Matrix, floor?: string, time?: BigNumber | number, error?: BigNumber | number }) {
        this.x = bignumber(data.x)
        this.y = bignumber(data.y)
        if (data.floor) this.floor = data.floor
        if (data.covariance) {
            this.covariance = data.covariance
            if (!data.error) {
                this.error = matrix([
                    [this.covariance.get([0, 0]).sqrt()],
                    [this.covariance.get([1, 1]).sqrt()]
                ])
            }
        }
        if (data.time) this.time = bignumber(data.time)
    }

    static createFormInertial(displacement: Matrix, point: Point, time: BigNumber) {
        return new this({ x: displacement.get([0, 0]), y: displacement.get([1, 0]), floor: point.floor, time })
    }
}