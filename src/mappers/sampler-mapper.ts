import { NotAcceptableException } from '@nestjs/common';
import { FilterType } from '@sampler-editor-librarian/dto';
import { Pitch, ZonePlayback } from '@sampler-editor-librarian/dto';
import { Waveform } from '@sampler-editor-librarian/dto';
import { Reassignment } from '@sampler-editor-librarian/dto';
import { ModulationSourceType } from '@sampler-editor-librarian/dto';
import { BendMode } from '@sampler-editor-librarian/dto';
import { PlaybackType } from '@sampler-editor-librarian/dto';

const SAMPLER_CHAR_MAP = [
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  ' ',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
  '*',
  '+',
  '-',
  '.',
];

const NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP = new Map<number, number>();
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(0, 0.0);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(254, -0.01);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(251, -0.02);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(249, -0.03);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(246, -0.04);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(244, -0.05);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(241, -0.06);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(238, -0.07);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(236, -0.08);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(233, -0.09);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(231, -0.1);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(228, -0.11);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(226, -0.12);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(223, -0.13);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(221, -0.14);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(218, -0.15);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(215, -0.16);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(213, -0.17);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(210, -0.18);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(208, -0.19);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(205, -0.2);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(203, -0.21);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(200, -0.22);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(197, -0.23);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(195, -0.24);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(192, -0.25);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(190, -0.26);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(187, -0.27);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(185, -0.28);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(182, -0.29);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(180, -0.3);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(177, -0.31);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(174, -0.32);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(172, -0.33);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(169, -0.34);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(167, -0.35);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(164, -0.36);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(162, -0.37);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(159, -0.38);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(157, -0.39);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(154, -0.4);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(151, -0.41);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(149, -0.42);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(146, -0.43);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(144, -0.44);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(141, -0.45);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(139, -0.46);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(136, -0.47);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(133, -0.48);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(131, -0.49);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(128, -0.5);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(126, -0.51);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(123, -0.52);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(121, -0.53);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(118, -0.54);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(116, -0.55);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(113, -0.56);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(110, -0.57);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(108, -0.58);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(105, -0.59);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(103, -0.6);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(100, -0.61);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(98, -0.62);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(95, -0.63);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(93, -0.64);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(90, -0.65);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(87, -0.66);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(85, -0.67);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(82, -0.68);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(80, -0.69);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(77, -0.7);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(75, -0.71);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(72, -0.72);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(69, -0.73);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(67, -0.74);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(64, -0.75);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(62, -0.76);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(59, -0.77);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(57, -0.78);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(54, -0.79);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(52, -0.8);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(49, -0.81);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(46, -0.82);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(44, -0.83);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(41, -0.84);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(39, -0.85);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(36, -0.86);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(34, -0.87);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(31, -0.88);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(29, -0.89);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(26, -0.9);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(23, -0.91);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(21, -0.92);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(18, -0.93);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(16, -0.94);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(13, -0.95);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(11, -0.96);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(8, -0.97);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(5, -0.98);
NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.set(3, -0.99);

const SYSEX_TO_NEGATIVE_FRACTION_LOOKUP = new Map<number, number>();
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.0, 0);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.01, 254);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.02, 251);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.03, 249);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.04, 246);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.05, 244);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.06, 241);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.07, 238);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.08, 236);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.09, 233);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.1, 231);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.11, 228);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.12, 226);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.13, 223);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.14, 221);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.15, 218);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.16, 215);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.17, 213);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.18, 210);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.19, 208);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.2, 205);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.21, 203);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.22, 200);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.23, 197);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.24, 195);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.25, 192);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.26, 190);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.27, 187);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.28, 185);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.29, 182);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.3, 180);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.31, 177);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.32, 174);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.33, 172);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.34, 169);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.35, 167);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.36, 164);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.37, 162);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.38, 159);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.39, 157);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.4, 154);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.41, 151);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.42, 149);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.43, 146);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.44, 144);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.45, 141);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.46, 139);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.47, 136);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.48, 133);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.49, 131);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.5, 128);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.51, 126);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.52, 123);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.53, 121);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.54, 118);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.55, 116);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.56, 113);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.57, 110);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.58, 108);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.59, 105);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.6, 103);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.61, 100);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.62, 98);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.63, 95);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.64, 93);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.65, 90);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.66, 87);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.67, 85);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.68, 82);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.69, 80);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.7, 77);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.71, 75);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.72, 72);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.73, 69);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.74, 67);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.75, 64);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.76, 62);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.77, 59);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.78, 57);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.79, 54);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.8, 52);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.81, 49);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.82, 46);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.83, 44);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.84, 41);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.85, 39);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.86, 36);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.87, 34);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.88, 31);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.89, 29);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.9, 26);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.91, 23);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.92, 21);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.93, 18);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.94, 16);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.95, 13);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.96, 11);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.97, 8);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.98, 5);
SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.set(-0.99, 3);

const POSITIVE_FRACTION_FROM_SYSEX_LOOKUP = new Map<number, number>();
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(0, 0.0);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(2, 0.01);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(5, 0.02);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(7, 0.03);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(10, 0.04);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(12, 0.05);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(15, 0.06);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(18, 0.07);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(20, 0.08);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(23, 0.09);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(25, 0.1);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(28, 0.11);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(30, 0.12);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(33, 0.13);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(35, 0.14);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(38, 0.15);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(41, 0.16);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(43, 0.17);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(46, 0.18);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(48, 0.19);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(51, 0.2);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(53, 0.21);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(56, 0.22);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(59, 0.23);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(61, 0.24);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(64, 0.25);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(66, 0.26);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(69, 0.27);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(71, 0.28);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(74, 0.29);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(76, 0.3);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(79, 0.31);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(82, 0.32);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(84, 0.33);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(87, 0.34);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(89, 0.35);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(92, 0.36);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(94, 0.37);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(97, 0.38);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(99, 0.39);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(102, 0.4);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(105, 0.41);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(107, 0.42);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(110, 0.43);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(112, 0.44);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(115, 0.45);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(117, 0.46);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(120, 0.47);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(123, 0.48);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(125, 0.49);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(128, 0.5);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(130, 0.51);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(133, 0.52);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(135, 0.53);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(138, 0.54);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(140, 0.55);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(143, 0.56);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(146, 0.57);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(148, 0.58);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(151, 0.59);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(153, 0.6);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(156, 0.61);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(158, 0.62);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(161, 0.63);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(163, 0.64);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(166, 0.65);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(169, 0.66);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(171, 0.67);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(174, 0.68);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(176, 0.69);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(179, 0.7);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(181, 0.71);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(184, 0.72);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(187, 0.73);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(189, 0.74);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(192, 0.75);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(194, 0.76);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(197, 0.77);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(199, 0.78);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(202, 0.79);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(204, 0.8);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(207, 0.81);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(210, 0.82);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(212, 0.83);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(215, 0.84);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(217, 0.85);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(220, 0.86);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(222, 0.87);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(225, 0.88);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(227, 0.89);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(230, 0.9);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(233, 0.91);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(235, 0.92);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(238, 0.93);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(240, 0.94);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(243, 0.95);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(245, 0.96);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(248, 0.97);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(251, 0.98);
POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.set(253, 0.99);

const SYSEX_TO_POSITIVE_FRACTION_LOOKUP = new Map<number, number>();
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.0, 0);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.01, 2);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.02, 5);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.03, 7);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.04, 10);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.05, 12);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.06, 15);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.07, 18);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.08, 20);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.09, 23);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.1, 25);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.11, 28);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.12, 30);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.13, 33);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.14, 35);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.15, 38);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.16, 41);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.17, 43);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.18, 46);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.19, 48);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.2, 51);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.21, 53);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.22, 56);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.23, 59);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.24, 61);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.25, 64);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.26, 66);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.27, 69);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.28, 71);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.29, 74);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.3, 76);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.31, 79);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.32, 82);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.33, 84);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.34, 87);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.35, 89);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.36, 92);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.37, 94);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.38, 97);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.39, 99);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.4, 102);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.41, 105);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.42, 107);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.43, 110);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.44, 112);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.45, 115);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.46, 117);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.47, 120);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.48, 123);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.49, 125);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.5, 128);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.51, 130);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.52, 133);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.53, 135);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.54, 138);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.55, 140);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.56, 143);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.57, 146);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.58, 148);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.59, 151);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.6, 153);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.61, 156);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.62, 158);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.63, 161);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.64, 163);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.65, 166);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.66, 169);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.67, 171);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.68, 174);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.69, 176);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.7, 179);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.71, 181);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.72, 184);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.73, 187);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.74, 189);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.75, 192);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.76, 194);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.77, 197);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.78, 199);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.79, 202);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.8, 204);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.81, 207);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.82, 210);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.83, 212);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.84, 215);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.85, 217);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.86, 220);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.87, 222);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.88, 225);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.89, 227);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.9, 230);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.91, 233);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.92, 235);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.93, 238);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.94, 240);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.95, 243);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.96, 245);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.97, 248);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.98, 251);
SYSEX_TO_POSITIVE_FRACTION_LOOKUP.set(0.99, 253);

export interface SamplerHeaderMapper<T> {
  mapFromSysexData(data: Array<number>): T;
  mapToSysexData(item: T): Array<number>;
  mapFromUIDataByIndex(index: number, uiData: number): Array<number>;
  mapFromUIName(index: number, name: string): Array<number>;
}

export class SamplerMapperBase {
  convertSampleSysexWaveform(waveform: number): Waveform {
    let convertedWaveForm = Waveform.TRIANGLE;

    switch (waveform) {
      case 0:
        convertedWaveForm = Waveform.TRIANGLE;
        break;
      case 1:
        convertedWaveForm = Waveform.SAWTOOTH;
        break;
      case 2:
        convertedWaveForm = Waveform.SQUARE;
        break;
      case 3:
        convertedWaveForm = Waveform.RANDOM;
        break;
      default:
        convertedWaveForm = Waveform.TRIANGLE;
        break;
    }

    return convertedWaveForm;
  }

  convertSampleSysexZonePlayback(zonePlaybackNumber: number): ZonePlayback {
    let convertedZonePlayback = ZonePlayback.AS_SAMPLE;

    switch (zonePlaybackNumber) {
      case 0:
        convertedZonePlayback = ZonePlayback.AS_SAMPLE;
        break;
      case 1:
        convertedZonePlayback = ZonePlayback.LOOP_IN_RELEASE;
        break;
      case 2:
        convertedZonePlayback = ZonePlayback.LOOP_UNTIL_RELEASE;
        break;
      case 3:
        convertedZonePlayback = ZonePlayback.NO_LOOPS;
        break;
      default:
        convertedZonePlayback = ZonePlayback.PLAY_TO_SAMPLE_END;
        break;
    }

    return convertedZonePlayback;
  }

  convertSampleSysexSamplePlayback(samplePlaybackNumber: number): PlaybackType {
    let playbackType = PlaybackType.LOOP_IN_RELEASE;

    switch (samplePlaybackNumber) {
      case 0:
        playbackType = PlaybackType.LOOP_IN_RELEASE;
        break;
      case 1:
        playbackType = PlaybackType.LOOP_UNTIL_RELEASE;
        break;
      case 2:
        playbackType = PlaybackType.NO_LOOPING;
        break;
      case 3:
        playbackType = PlaybackType.PLAY_TO_SAMPLE_END;
        break;
      default:
        playbackType = PlaybackType.LOOP_IN_RELEASE;
        break;
    }

    return playbackType;
  }

  convertSampleSysexZonePitch(pitchNumber: number): Pitch {
    return pitchNumber == 0 ? Pitch.TRACK : Pitch.CONST;
  }

  convertSampleSysexBendMode(bendModeNumber: number): BendMode {
    return bendModeNumber == 0 ? BendMode.NORMAL : BendMode.HELD;
  }

  convertReassignment(reassignment: number): Reassignment {
    return reassignment == 0 ? Reassignment.OLDEST : Reassignment.QUIETEST;
  }

  convertSampleSysexFilterType(filterTypeNumber: number): FilterType {
    let filterType = FilterType.LOW_PASS;

    switch (filterTypeNumber) {
      case 0:
        filterType = FilterType.LOW_PASS;
        break;
      case 1:
        filterType = FilterType.BAND_PASS;
        break;
      case 2:
        filterType = FilterType.HIGH_PASS;
        break;
      case 3:
        filterType = FilterType.EQ;
        break;
      default:
        filterType = FilterType.LOW_PASS;
        break;
    }

    return filterType;
  }

  convertSampleSysexModulationSourceType(
    modulationSourceType: number,
  ): ModulationSourceType {
    let convertedModulationSourceType = ModulationSourceType.No_Source;

    switch (modulationSourceType) {
      case 0:
        convertedModulationSourceType = ModulationSourceType.No_Source;
        break;
      case 1:
        convertedModulationSourceType = ModulationSourceType.Modwheel;
        break;
      case 2:
        convertedModulationSourceType = ModulationSourceType.Bend;
        break;
      case 3:
        convertedModulationSourceType = ModulationSourceType.Pressure;
        break;
      case 4:
        convertedModulationSourceType = ModulationSourceType.External;
        break;
      case 5:
        convertedModulationSourceType = ModulationSourceType.NoteOnvelocity;
        break;
      case 6:
        convertedModulationSourceType = ModulationSourceType.Key;
        break;
      case 7:
        convertedModulationSourceType = ModulationSourceType.LFO1;
        break;
      case 8:
        convertedModulationSourceType = ModulationSourceType.LFO2;
        break;
      case 9:
        convertedModulationSourceType = ModulationSourceType.Env1;
        break;
      case 10:
        convertedModulationSourceType = ModulationSourceType.Env2;
        break;
      case 11:
        convertedModulationSourceType = ModulationSourceType.NOT_Modwheel;
        break;
      case 12:
        convertedModulationSourceType = ModulationSourceType.NOT_Bend;
        break;
      case 13:
        convertedModulationSourceType = ModulationSourceType.NOT_External;
        break;
      case 14:
        convertedModulationSourceType = ModulationSourceType.Env3;
        break;
      default:
        convertedModulationSourceType = ModulationSourceType.No_Source;
        break;
    }

    return convertedModulationSourceType;
  }

  convertSamplerSysexNameToName(name_bytes: Array<number>): string {
    let name = '';

    for (const [index, name_byte] of name_bytes.entries()) {
      name = name + SAMPLER_CHAR_MAP[name_byte];
    }

    return name;
  }

  convertNameToSamplerSysexName(name: string): Array<number> {
    const name_bytes = [];

    while (name.length < 12) {
      name = name + ' ';
    }

    Array.from(name.toUpperCase()).forEach((value) => {
      const index = SAMPLER_CHAR_MAP.findIndex(
        (mapValue) => value === mapValue,
      );

      if (index >= 0) {
        name_bytes.push(index);
      } else {
        throw new NotAcceptableException(
          'Could not find item name character to sysex name character',
        );
      }
    });

    return name_bytes;
  }

  convertFractionalPartOfValue(
    wholeByte: number,
    fractionByte: number,
  ): number {
    if (wholeByte >= 206 && fractionByte > 0) {
      return Math.round((fractionByte / 256) * 100 - 100);
    }
    return Math.round((fractionByte / 256) * 100);
  }

  convertToPlusOrMinusFiftyWithFraction(
    wholeByte: number,
    fractionByte: number,
  ): number {
    if (wholeByte >= 206 && fractionByte == 0) {
      return wholeByte - 256;
    } else if (wholeByte >= 206 && fractionByte > 0) {
      return wholeByte - 255;
    }
    return wholeByte;
  }

  convertToPlusOrMinusFiftyIncludingFraction(
    wholeByte: number,
    fractionByte: number,
  ): number {
    if (wholeByte >= 206 && fractionByte == 0) {
      return wholeByte - 256;
    } else if (wholeByte >= 206 && fractionByte > 0) {
      return (
        wholeByte - 255 + NEGATIVE_FRACTION_FROM_SYSEX_LOOKUP.get(fractionByte)
      );
    }
    return wholeByte + POSITIVE_FRACTION_FROM_SYSEX_LOOKUP.get(fractionByte);
  }

  convertFromPlusOrMinusFiftyIncludingFraction(tuning: number): Array<number> {
    let wholeByte = 0;
    let fractionByte = 0;

    const wholePart = Math.trunc(tuning);
    const fractionalPart = Math.round((tuning % 1) * 100) / 100;

    if (wholePart < 0 && fractionalPart === 0.0) {
      wholeByte = 256 + wholePart;
    } else if (wholePart < 0 || fractionalPart < 0) {
      wholeByte = 255 + wholePart;
      fractionByte = SYSEX_TO_NEGATIVE_FRACTION_LOOKUP.get(fractionalPart);
    } else if (fractionalPart == 0.0) {
      wholeByte = wholePart;
    } else {
      wholeByte = wholePart;
      fractionByte = SYSEX_TO_POSITIVE_FRACTION_LOOKUP.get(fractionalPart);
    }

    return [fractionByte, wholeByte];
  }

  convertToPlusOrMinusFifty(value: number): number {
    if (value >= 206) {
      return value - 256;
    }
    return value;
  }

  convertFromPlusOrMinusFifty(value: number): number {
    if (value < 0) {
      return 256 + value;
    }
    return value;
  }

  convertToPlusOrMinusTwentyFour(value: number): number {
    if (value >= 232) {
      return value - 256;
    }
    return value;
  }

  convertFromPlusOrMinusTwentyFour(value: number): number {
    if (value < 0) {
      return 256 + value;
    }
    return value;
  }

  convertToPlusOrMinusTwelve(value: number): number {
    if (value >= 244) {
      return value - 256;
    }
    return value;
  }

  convertFromPlusOrMinusTwelve(value: number): number {
    if (value < 0) {
      return 256 + value;
    }
    return value;
  }

  convertToPlusOrMinusNineNineNine(value: number): number {
    if (value >= 55537) {
      return value - 65536;
    }
    return value;
  }

  convertFromPlusOrMinusNineNineNine(value: number): number[] {
    if (value < 0) {
      const result = 65536 + value;
      return [result & 255, result >> 8];
    }

    return [value & 255, value >> 8];
  }

  convertToTwoBytes(value: number): number[] {
    const result = [];

    result.push(value & 255);
    result.push((value >> 8) & 255);

    return result;
  }

  convertToFourBytes(value: number): number[] {
    const result = [];

    result.push(value & 255);
    result.push((value >> 8) & 255);
    result.push((value >> 16) & 255);
    result.push((value >> 24) & 255);

    return result;
  }

  convertToSixBytes(value: number): number[] {
    const result = [];

    result.push(value & 255);
    result.push((value >> 8) & 255);
    result.push((value >> 16) & 255);
    result.push((value >> 24) & 255);
    result.push((value >> 32) & 255);
    result.push((value >> 40) & 255);

    return result;
  }

  convertToLoopLengthIncludingFraction(
    fractionNumber: number[],
    wholeNumber: number[],
  ): number {
    const loopLengthMinor = Math.round(
      (fractionNumber[0] | (fractionNumber[1] << 8)) / (65535 / 999),
    );
    const loopLength =
      wholeNumber[0] |
      (wholeNumber[1] << 8) |
      (wholeNumber[2] << 16) |
      (wholeNumber[3] << 24);
    return loopLength + loopLengthMinor / 1000;
  }

  convertFromLoopLengthIncludingFraction(
    loopLength: number,
  ): Array<Array<number>> {
    const wholePart = Math.trunc(loopLength);
    let fractionalPart = (loopLength % 1) * 1000;

    if (fractionalPart >= 998.9) {
      fractionalPart = 65535;
    } else {
      fractionalPart = Math.round(fractionalPart * 65.6);
    }

    return [
      [fractionalPart & 255, fractionalPart >> 8],
      [
        wholePart & 255,
        (wholePart >> 8) & 255,
        (wholePart >> 16) & 255,
        (wholePart >> 24) & 255,
      ],
    ];
  }
}
