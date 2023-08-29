import { all, create } from "mathjs";
export const mathjs = create(all);
mathjs.config({
    number: 'BigNumber',
    precision: 64,
    epsilon: 1e-60
})