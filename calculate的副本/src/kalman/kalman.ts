import { add, BigNumber, identity, inv, log, Matrix, multiply } from "mathjs";
import { Point } from "../lib/point";
import { mathjs } from "../lib/math";
import { Equation } from "../lib/equation";

const { bignumber, divide, pow, subtract } = mathjs

type FloorMap = Map<string, {
    x: BigNumber;
    y: BigNumber;
    weight: BigNumber;
    floor: string;
}>

type PrecisionRange = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type iBeacon = {
    x: number;
    y: number;
    floor: string;
    accuracy: number;
}

export default class Kalman {

    beacons: iBeacon[];

    floors: FloorMap = new Map();

    data: WeightBeacon[];

    points: Point[];

    O: Point; // 最近似点

    X: Point; // 先验估计值

    A: Matrix; // 状态转移方程

    H: Matrix; // 估计状态转测量状态的方程

    K: Matrix; // 卡尔曼增益

    Q: Matrix; // 估计值的协方差

    R: Matrix; // 测量值协方差

    E_est: Point; // 估计误差

    correlate: boolean = false; // 是否计算协方差

    time: number;

    constructor(beacons: iBeacon[], time: number) {
        this.beacons = beacons
        this.time = time
    }

    collect() {
        this.data = this.beacons
            .sort((a, b) => b.accuracy - a.accuracy)
            .map(({ x, y, floor, accuracy }) => {
                let weight = accuracy == 0 ? bignumber(1) : bignumber(1).div(bignumber(accuracy).pow(2)); // 1 / accuracy * accuracy
                this.floors.set(floor, { x: bignumber(x), y: bignumber(y), floor, weight })
                return {
                    x: bignumber(x),
                    y: bignumber(y),
                    accuracy: bignumber(accuracy),
                    weight,
                    weightX: bignumber(x).pow(2).mul(weight), // x * x * weight
                    weightY: bignumber(y).pow(2).mul(weight), // y * y * weight
                }
            })
        return this
    }

    filter(precision: PrecisionRange, line?: Line): Point {
        let point: Point;
        if (this.data.length > 3) {
            point = this[`calculate${precision}`]()
        } else if (line) {
            point = this.calculate8(line, Equation.weighting(this.data, true))
        } else {
            point = Equation.weighting(this.data, true)
        }
        if (this.floors.size == 1) {
            point.floor = Array.from(this.floors.keys())[0]
        } else {
            Array.from(this.floors.values()).reduce((cur, next) => {
                let z = next.weight.sub(next.x.sub(point.x).pow(2)).sub(next.y.sub(point.y).pow(2))
                if (z < cur.z) {
                    point.floor = next.floor
                    cur.z = z
                }
                return cur
            }, { z: bignumber(999999) })
        }
        point.time = bignumber(this.time)
        return point
    }

    calculate1(): Point {
        return Equation.weighting(this.data, this.correlate)
    }

    calculate2(): Point {
        let length = this.data.length - 3
        for (let index = 0; index < length; index++) {
            this.points.push(
                Equation.weighting([this.data[index], this.data[index + 1], this.data[index + 2], this.data[index + 3]], this.correlate)
            )
        }
        return Equation.average(this.points, this.correlate)
    }

    calculate3(): Point {
        this.X = this.calculate1();
        this.O = this.calculate2();
        this.E_est = Equation.absDiff(this.X, this.O)

        this.points.forEach(Z => {
            // 计算卡尔曼系数： 上一次的估计误差 / ( 当前的测量误差 + 上一次估计误差 ) 
            this.K = multiply(inv(add(Equation.absDiff(this.X, this.O).vector, this.E_est.vector)), this.E_est.vector)
            // 更新估计值：上一次的估计值 + K* (当前测量值 - 上一次的估计值) 
            this.X = Equation.updateEstimateSimple(this.K, Z, this.O)
            // （1 - 这一次的K）* 上一次的估计误差
            this.E_est = Equation.updateErrorOfEstimateSimple(this.K, this.E_est)

        })

        this.X.covariance = this.E_est.vector
        return this.X
    }

    calculate4(): Point {
        this.X = this.calculate1();
        this.O = this.calculate2();

        // 设置估计值的协方差
        this.R = Equation.covariance(this.X, this.O);

        // 设置估计状态转测量状态的方程
        this.H = Equation.stateTransition(this.O, this.X)

        let Q = Equation.covariance(this.points[0], this.X);

        // 设置初始状态转移方程 TODO 这块有疑问
        this.A = Equation.stateTransition(this.X, this.O)

        // 设置初始误差协方差
        let P_mea = this.R

        let X: Matrix;

        let X_mea: Matrix;

        this.points.forEach(point => {

            // 通过属实估算值算出第一估计值
            X = multiply(this.A, this.O.vector)

            // 计算初始先验误差协方差
            let P_est = add(multiply(multiply(this.A, P_mea), inv(this.A)), Q)

            // 计算卡尔曼增益
            let K = multiply(
                inv(
                    add(
                        multiply(
                            multiply(this.H, P_est), inv(this.H)
                        ),
                        this.R
                    )
                ),
                multiply(
                    P_est,
                    inv(this.H)
                )
            )

            // 计算后验估计
            X_mea = add(X, multiply(K, subtract(point.vector, multiply(this.H, X))))

            // 更新P_mea
            P_mea = multiply(subtract(identity(2), multiply(K, this.H)), P_est)

            // this.A = Equation.stateTransition(point, this.X)

            // this.X = point
        })

        return new Point({
            x: X_mea!.get([0, 0]),
            y: X_mea!.get([1, 0]),
            covariance: P_mea
        })
    }

    calculate5(): Point {
        this.X = this.calculate1();
        this.O = this.calculate2();

        // 设置估计值的协方差
        this.R = this.X.covariance;

        // 设置估计状态转测量状态的方程
        this.H = Equation.stateTransition(this.O, this.X)

        this.Q = this.O.covariance;

        // 设置初始状态转移方程
        this.A = Equation.stateTransition(this.X, this.O)

        // 设置初始误差协方差
        let P_mea = Equation.covariance(this.X, this.O)

        let X: Matrix;

        let X_mea: Matrix;

        this.points.forEach(point => {

            // 通过属实估算值算出第一估计值
            X = multiply(this.A, this.O.vector)

            // 计算初始先验误差协方差
            let P_est = add(multiply(multiply(this.A, P_mea), inv(this.A)), this.Q)

            // 计算卡尔曼增益
            let K = multiply(
                inv(
                    add(
                        multiply(
                            multiply(this.H, P_est), inv(this.H)
                        ),
                        this.R
                    )
                ),
                multiply(
                    P_est,
                    inv(this.H)
                )
            )

            // 计算后验估计
            X_mea = add(X, multiply(K, subtract(point.vector, multiply(this.H, X))))

            // 更新P_mea
            P_mea = multiply(subtract(identity(2), multiply(K, this.H)), P_est)

            this.A = Equation.stateTransition(point, this.X)

            this.X = point
        })

        return new Point({
            x: X_mea!.get([0, 0]),
            y: X_mea!.get([1, 0]),
            covariance: P_mea
        })
    }

    calculate6(): Point {
        this.X = this.calculate1();
        this.O = this.calculate2();

        // 设置估计值的协方差
        this.R = this.X.covariance;

        // 设置估计状态转测量状态的方程
        this.H = Equation.stateTransition(this.O, this.X)

        this.Q = this.O.covariance;

        // 设置初始状态转移方程
        this.A = Equation.stateTransition(this.X, this.O)

        // 设置初始误差协方差
        let P_mea = Equation.covariance(this.X, this.O)

        let X: Matrix;

        let X_mea: Matrix;

        this.points.forEach(point => {
            // 通过属实估算值算出第一估计值
            let X = Equation.simga(Equation.covariance(point, this.O), this.A, point)

            // 计算初始先验误差协方差
            let P_est = add(multiply(multiply(this.A, P_mea), inv(this.A)), this.Q)

            // 计算卡尔曼增益
            let K = multiply(
                inv(
                    add(
                        multiply(
                            multiply(this.H, P_est), inv(this.H)
                        ),
                        this.R
                    )
                ),
                multiply(
                    P_est,
                    inv(this.H)
                )
            )

            // 计算后验估计
            X_mea = add(X, multiply(K, subtract(point.vector, multiply(this.H, X))))

            // 更新P_mea
            P_mea = multiply(subtract(identity(2), multiply(K, this.H)), P_est)
        })
        return new Point({
            x: X_mea!.get([0, 0]),
            y: X_mea!.get([1, 0]),
            covariance: P_mea
        })
    }

    calculate7(): Point {
        let points = Equation
            .generateCombinations<WeightBeacon>(this.data, 4)
            .map(beacons => Equation.weighting(beacons))

        return Equation.average(points)
    }

    calculate8(line: Line, point: Point): Point {
        let points: Point[] = this.data.map(ibeacon => {
            return Equation.nearLinePoint(ibeacon, line, point)
        })
        return Equation.average(points)
    }
}


