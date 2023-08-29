import { BigNumber, Matrix } from "mathjs";
import { mathjs } from "../lib/math";
import { Point } from "../lib/point";
import { Equation } from "../lib/equation";
const { bignumber, matrix, identity, multiply } = mathjs

export default class GPS {

    time: number;

    earthRad: BigNumber = bignumber(6378137);

    x: BigNumber;

    y: BigNumber;

    E_mea: Matrix;

    point: Point;

    constructor({ time, value: { latitude, longitude, horizontalAccuracy } }: GPSMessage, { bdid }: Account) {
        this.time = time

        this.x = bignumber(longitude).mul(Math.PI).div(180).mul(this.earthRad)

        this.y = bignumber(latitude).mul(Math.PI).div(360).add(bignumber(Math.PI).div(4)).tan().ln().mul(this.earthRad)

        this.E_mea = Equation.simpleMeasureError(horizontalAccuracy)

        this.point = new Point({ x: this.x, y: this.y, floor: `${bdid}F01`, time, covariance: this.E_mea })

    }
}
