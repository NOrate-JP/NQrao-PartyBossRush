import Lakitu from './lakitu.js';
import Wiggler from './wiggler.js';
import Whomp from './whomp.js';
import KingBomb from './kingbomb.js';
import DryBones from './drybones.js';
import KingBoo from './kingboo.js';
import Cheep from './cheep.js';
import Blooper from './blooper.js';
import Spike from './spike.js';
import Chomp from './chomp.js';
import BowserJr from './bowserjr.js';
import Bowser from './bowser.js';

// ボスラッシュの順番（ソロモードと同じ）
export const GAMES = [Lakitu, Wiggler, Whomp, KingBomb, DryBones, KingBoo, Cheep, Blooper, Spike, Chomp, BowserJr, Bowser];
export const COURSES = {
  mid: { name: '中ボスラッシュ', list: [0, 2, 4, 6, 8, 10] },
  boss: { name: 'ボスラッシュ', list: [1, 3, 5, 7, 9, 11] },
  all: { name: 'オールボスラッシュ', list: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
};
