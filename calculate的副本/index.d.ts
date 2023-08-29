import { BigNumber, Matrix } from "mathjs";
import Compass from "./src/compass/compass";
import { Point } from "./src/lib/point";

declare global {
    interface Environment {
        app: 'WeChat' | 'Alipay' | 'Native' | 'Browser';
        view: 'WebView' | 'Page';
        system: 'iOS' | 'Android';
    }

    type Account = {
        appsId: string;
        openId: string;
        bdid: string;
    }

    type Line = {
        k: BigNumber;
        h: BigNumber;
        m: BigNumber;
    }
    type LocationConfig = {
        aoa: boolean;
        gps: boolean;
        ble: boolean;
        compass: boolean,
        motion: boolean;
        accelerometer: boolean;
    }

    // Beacon 相关
    type WeightBeacon = {
        x: BigNumber;
        y: BigNumber;
        accuracy: BigNumber;
        weight: BigNumber;
        weightX: BigNumber;
        weightY: BigNumber;
    }

    type iBeacon = {
        x: number;
        y: number;
        floor: string;
        accuracy: number;
    }

    interface Beacon {

        uuid: string;

        major: string;

        minor: string;

        proximity: 0 | 1 | 2 | 3;

        accuracy: number;

        rssi: number;

        x: number;

        y: number;

        floor: string;

    }


    type BeaconConfig = {
        x: number;
        y: number;
        floor: string;
    }

    type BeaconMap = Map<string, BeaconConfig>

    type Acceleration = {
        x: number;
        y: number;
        z: number;
    }

    // 罗盘
    type iOSCompassData = {
        direction: number;
        accuracy: number;
    }

    type AndroidCompassData = {
        direction: number;
        accuracy: 'high' | 'medium' | 'low' | 'no-contact' | 'unreliable' | 'unknow';
    }

    type CompassData = AndroidCompassData | iOSCompassData

    // 定位数据相关
    type GPSMessage = {
        event: 'collect';
        origin: 'gps';
        success: boolean;
        value: {
            latitude: number;
            longitude: number;
            accuracy: number;
            horizontalAccuracy: number
        }
        time: number;
    }

    type BleMessage = {
        event: 'collect';
        origin: 'ble';
        success: boolean;
        value: Beacon[]
        time: number;
    }

    type AOAMessage = {
        event: 'collect';
        origin: 'aoa';
        success: boolean;
        value: Beacon[]
        time: number;
    }

    type CompassMessage = {
        event: 'collect';
        origin: 'compass';
        success: boolean;
        value: CompassData
        time: number;
    }

    type MotionMessage = {
        event: 'collect';
        origin: 'motion';
        success: boolean;
        time: number;
        value: {
            alpha: number;
            beta: number;
            gamma: number;
        }
    }

    type AccelerometerMessage = {
        event: 'collect';
        origin: 'accelerometer';
        success: boolean;
        time: number;
        value: Acceleration
    }

    type CollectMessage = GPSMessage | BleMessage | AOAMessage | CompassMessage | MotionMessage | AccelerometerMessage

    // 生命周期消息
    type InitMessage = {
        event: 'init';
        env: Environment;
        config: LocationConfig;
        value: Account
    }

    type ReadyMessage = {
        event: 'ready';
        value: BeaconMap;
    }

    type DestroyMessage = {
        event: 'destroy',
        value: null
    }

    type EventMessage = InitMessage | CollectMessage | DestroyMessage

    type LifeCycleMessage = EventMessage | ReadyMessage

    // 响应消息

    type ReadyAnswerMessage = {
        event: 'ready';
        success: boolean
    }

    type LocationCalculateAnswerMessage = {
        event: 'location-measure';
        success: boolean;
        time: number,
        value: Point
    }

    type LocationInertialAnswerMessage = {
        event: 'location-inertial';
        success: boolean;
        time: number,
        value: Point
    }

    type DirectionCalculateAnswerMessage = {
        event: 'direction';
        success: boolean;
        duration: number,
        value: BigNumber
    }

    type DestroyAnswerMessage = {
        event: 'destroy';
        success: boolean
    }

    type AnswerMessage = ReadyAnswerMessage | LocationCalculateAnswerMessage | LocationInertialAnswerMessage | DirectionCalculateAnswerMessage | DestroyAnswerMessage

    // 猜想消息
    type LineGuessMessage = {
        origin: 'line';
        success: boolean;
        time: number;
        value: Line
    }

    type LocationGuessMessage = {
        origin: 'location';
        success: boolean;
        time: {
            ahead: number;
            next: number;
        };
        value: {
            ahead: Point;
            next: Point;
        }
    }


    type GuessMessage = LocationGuessMessage | LineGuessMessage


    type SummationInitialValue = {
        velocity: Matrix,
        acceleration: Matrix[],
        time: BigNumber[]
    }

    type InitialState = {
        displacement: Matrix;
        velocity: Matrix;
        error?: Matrix[]
    }
}






