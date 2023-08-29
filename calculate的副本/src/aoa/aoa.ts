import { BigNumber, Matrix } from "mathjs";
import { mathjs } from "../lib/math";
import { Point } from "../lib/point";
const { bignumber } = mathjs

export default class AOA {
    time: number;

    earthRad: BigNumber = bignumber(6378137);

    x: BigNumber;

    y: BigNumber;

    E_mea: Matrix;

    point: Point

    constructor({ time, value }: AOAMessage) {
        this.time = time
    }
}