import { SamplerMapperBase } from './sampler-mapper';

describe('SamplerMapperBaseConversionFunctions', () => {
  beforeEach(async () => {});

  it('ConvertFromPlusOrMinus24', () => {
    const base = new SamplerMapperBase();

    expect(base.convertFromPlusOrMinusTwentyFour(-24)).toBe(232);
    expect(base.convertFromPlusOrMinusTwentyFour(-1)).toBe(255);
    expect(base.convertFromPlusOrMinusTwentyFour(0)).toBe(0);
    expect(base.convertFromPlusOrMinusTwentyFour(24)).toBe(24);
  });

  it('ConvertToPlusOrMinus24', () => {
    const base = new SamplerMapperBase();

    expect(base.convertToPlusOrMinusTwentyFour(232)).toBe(-24);
    expect(base.convertToPlusOrMinusTwentyFour(255)).toBe(-1);
    expect(base.convertToPlusOrMinusTwentyFour(0)).toBe(0);
    expect(base.convertToPlusOrMinusTwentyFour(24)).toBe(24);
  });

  it('convertToLoopLengthIncludingFraction', () => {
    const base = new SamplerMapperBase();

    expect(
      base.convertToLoopLengthIncludingFraction([6, 1], [195, 13, 0, 0]),
    ).toBe(3523.004);
    expect(
      base.convertToLoopLengthIncludingFraction([255, 255], [195, 13, 0, 0]),
    ).toBe(3523.999);
    expect(
      base.convertToLoopLengthIncludingFraction([66, 0], [195, 13, 0, 0]),
    ).toBe(3523.001);
    expect(
      base.convertToLoopLengthIncludingFraction([0, 0], [195, 13, 0, 0]),
    ).toBe(3523.0);
  });

  it('convertFromLoopLengthIncludingFraction', () => {
    const base = new SamplerMapperBase();

    expect(base.convertFromLoopLengthIncludingFraction(3523.004)).toStrictEqual(
      [
        [6, 1],
        [195, 13, 0, 0],
      ],
    );
    expect(base.convertFromLoopLengthIncludingFraction(3523.998)).toStrictEqual(
      [
        [189, 255],
        [195, 13, 0, 0],
      ],
    );
    expect(base.convertFromLoopLengthIncludingFraction(3523.999)).toStrictEqual(
      [
        [255, 255],
        [195, 13, 0, 0],
      ],
    );
    expect(base.convertFromLoopLengthIncludingFraction(3523.001)).toStrictEqual(
      [
        [66, 0],
        [195, 13, 0, 0],
      ],
    );
    expect(base.convertFromLoopLengthIncludingFraction(3523.0)).toStrictEqual([
      [0, 0],
      [195, 13, 0, 0],
    ]);
  });

  it('convertFromPlusOrMinusFiftyIncludingFraction', () => {
    const base = new SamplerMapperBase();

    expect(
      base.convertFromPlusOrMinusFiftyIncludingFraction(-50.0),
    ).toStrictEqual([0, 206]);
    expect(
      base.convertFromPlusOrMinusFiftyIncludingFraction(-49.99),
    ).toStrictEqual([3, 206]);
    expect(
      base.convertFromPlusOrMinusFiftyIncludingFraction(-31.01),
    ).toStrictEqual([254, 224]);
    expect(
      base.convertFromPlusOrMinusFiftyIncludingFraction(-21.01),
    ).toStrictEqual([254, 234]);
    expect(
      base.convertFromPlusOrMinusFiftyIncludingFraction(-11.01),
    ).toStrictEqual([254, 244]);
    expect(
      base.convertFromPlusOrMinusFiftyIncludingFraction(-1.54),
    ).toStrictEqual([118, 254]);
    expect(
      base.convertFromPlusOrMinusFiftyIncludingFraction(-1.0),
    ).toStrictEqual([0, 255]);
    expect(
      base.convertFromPlusOrMinusFiftyIncludingFraction(-0.01),
    ).toStrictEqual([254, 255]);
    expect(
      base.convertFromPlusOrMinusFiftyIncludingFraction(0.0),
    ).toStrictEqual([0, 0]);
    expect(
      base.convertFromPlusOrMinusFiftyIncludingFraction(0.01),
    ).toStrictEqual([2, 0]);
    expect(
      base.convertFromPlusOrMinusFiftyIncludingFraction(11.01),
    ).toStrictEqual([2, 11]);
    expect(
      base.convertFromPlusOrMinusFiftyIncludingFraction(21.01),
    ).toStrictEqual([2, 21]);
    expect(
      base.convertFromPlusOrMinusFiftyIncludingFraction(31.01),
    ).toStrictEqual([2, 31]);
    expect(
      base.convertFromPlusOrMinusFiftyIncludingFraction(49.99),
    ).toStrictEqual([253, 49]);
    expect(
      base.convertFromPlusOrMinusFiftyIncludingFraction(50.0),
    ).toStrictEqual([0, 50]);
  });

  it('convertToPlusOrMinusFiftyIncludingFraction', () => {
    const base = new SamplerMapperBase();

    expect(base.convertToPlusOrMinusFiftyIncludingFraction(206, 0)).toBe(-50);
    expect(base.convertToPlusOrMinusFiftyIncludingFraction(206, 251)).toBe(
      -49.02,
    );
    expect(base.convertToPlusOrMinusFiftyIncludingFraction(206, 254)).toBe(
      -49.01,
    );
    expect(base.convertToPlusOrMinusFiftyIncludingFraction(255, 251)).toBe(
      -0.02,
    );
    expect(base.convertToPlusOrMinusFiftyIncludingFraction(255, 254)).toBe(
      -0.01,
    );
    expect(base.convertToPlusOrMinusFiftyIncludingFraction(0, 0)).toBe(0.0);
    expect(base.convertToPlusOrMinusFiftyIncludingFraction(0, 2)).toBe(0.01);
    expect(base.convertToPlusOrMinusFiftyIncludingFraction(0, 5)).toBe(0.02);
    expect(base.convertToPlusOrMinusFiftyIncludingFraction(0, 7)).toBe(0.03);
    expect(base.convertToPlusOrMinusFiftyIncludingFraction(0, 10)).toBe(0.04);
    expect(base.convertToPlusOrMinusFiftyIncludingFraction(0, 245)).toBe(0.96);
    expect(base.convertToPlusOrMinusFiftyIncludingFraction(0, 248)).toBe(0.97);
    expect(base.convertToPlusOrMinusFiftyIncludingFraction(0, 251)).toBe(0.98);
    expect(base.convertToPlusOrMinusFiftyIncludingFraction(0, 253)).toBe(0.99);
    expect(base.convertToPlusOrMinusFiftyIncludingFraction(49, 253)).toBe(
      49.99,
    );
  });
});
