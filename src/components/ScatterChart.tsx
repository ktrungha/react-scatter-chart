import React, { RefObject } from 'react';
import styled from 'styled-components';
import { throttle } from 'lodash';

const DATA_POINT_TYPE_CIRCLE = 'circle';
const DATA_POINT_TYPE_SQUARE = 'square';
const DATA_POINT_TYPE_TRIANGLE = 'triangle';
const DATA_POINT_TYPE_DIAMOND = 'diamond';

const Container = styled.div`
  width: fit-content;
  height: fit-content;
`;

const YLabelDiv = styled.div`
  display: flex;
  align-items: center;
`;

const YAxisDiv = styled.div`
  margin-right: 10px;
  display: flex;
  flex-direction: column-reverse;
  align-items: flex-end;
  justify-content: space-between;
  height: 100%;
`;

function range(n: number): number[] {
  const retval: number[] = [];
  for (let i = 0; i < n; i += 1) {
    retval.push(i);
  }
  return retval;
}

function convertX(
  x: number,
  minX: number,
  maxX: number,
  viewBoxMaxX: number,
): number {
  return ((x - minX) / (maxX - minX)) * viewBoxMaxX;
}

function convertY(y: number, minY: number, maxY: number): number {
  return 100 - ((y - minY) / (maxY - minY)) * 100;
}

function convertType(type: number): string {
  if (type === 0) {
    return DATA_POINT_TYPE_CIRCLE;
  }
  if (type === 1) {
    return DATA_POINT_TYPE_SQUARE;
  }
  if (type === 2) {
    return DATA_POINT_TYPE_TRIANGLE;
  }
  if (type === 3) {
    return DATA_POINT_TYPE_DIAMOND;
  }
  return '';
}

export type DataPointType = {
  readonly key: number;
  x: number;
  y: number;
  readonly color: string;
  readonly type: number;
};

type InternalDataPointType = {
  readonly key: number;
  readonly x: number;
  readonly y: number;
  readonly color: string;
  readonly type: number;
};

interface DataPointProps {
  type: string;
  x: number;
  y: number;
  color: string;
}

const DataPoint: React.SFC<DataPointProps> = ({ type, x, y, color }) => {
  const size = 2;
  if (type === DATA_POINT_TYPE_CIRCLE) {
    return <circle cx={x} cy={y} r={size} fill={color} />;
  }
  if (type === DATA_POINT_TYPE_SQUARE) {
    return (
      <polygon
        points={`${x - size} ${y - size}, ${x + size} ${y - size}, ${x +
          size} ${y + size}, ${x - size} ${y + size}`}
        fill={color}
      />
    );
  }
  if (type === DATA_POINT_TYPE_TRIANGLE) {
    const triangleSize = size * 1.5;
    return (
      <polygon
        points={`${x} ${y - triangleSize}, ${x + triangleSize * 0.866} ${y +
          triangleSize * 0.5}, ${x - triangleSize * 0.866} ${y +
          triangleSize * 0.5}`}
        fill={color}
      />
    );
  }
  if (type === DATA_POINT_TYPE_DIAMOND) {
    return (
      <polygon
        points={`${x} ${y - 2 * size * 0.707}, ${x +
          2 * size * 0.707} ${y}, ${x} ${y + 2 * size * 0.707}, ${x -
          2 * size * 0.707} ${y}`}
        fill={color}
      />
    );
  }
  return <div />;
};

DataPoint.defaultProps = {
  color: '#e0a31f',
};

interface SelectionRectangleProps {
  pos: {
    rectangleX1: number;
    rectangleX2: number;
    rectangleY1: number;
    rectangleY2: number;
  };
}

const SelectionRectangle: React.SFC<SelectionRectangleProps> = ({ pos }) => {
  const { rectangleX1, rectangleX2, rectangleY1, rectangleY2 } = pos;
  if (rectangleX1 === rectangleX2 && rectangleY1 === rectangleY2) {
    return <rect />;
  }
  return (
    <rect
      fill="#717272"
      fillOpacity={0.3}
      x={Math.min(rectangleX1, rectangleX2)}
      y={Math.min(rectangleY1, rectangleY2)}
      width={Math.abs(rectangleX2 - rectangleX1)}
      height={Math.abs(rectangleY1 - rectangleY2)}
    />
  );
};

class ScatterChart extends React.PureComponent<
  ScatterChartProps,
  ScatterChartState
> {
  svgContainer: RefObject<HTMLDivElement>;
  extra: number;

  constructor(props: ScatterChartProps) {
    super(props);

    this.svgContainer = React.createRef<HTMLDivElement>();
    this.extra = 4;

    this.state = {
      rectangleX1: 0,
      rectangleX2: 0,
      rectangleY1: 0,
      rectangleY2: 0,
      drawing: false,
      viewBoxMaxX: 0,
      convertData: [],
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
    };
    this.mouseDown = this.mouseDown.bind(this);
    this.mouseMove = throttle(this.mouseMove.bind(this), 100, {
      trailing: true,
    });
    this.mouseUp = this.mouseUp.bind(this);
  }

  public static defaultProps = {
    aspectRatio: 1,
    height: 300,
    xSteps: 10,
    ySteps: 10,
    data: [],
    onSelect: undefined,
  };

  static getDerivedStateFromProps(props: {
    data: DataPointType[];
    aspectRatio: number;
  }) {
    const { data, aspectRatio } = props;
    const { minX, maxX, minY, maxY } = data.reduce(
      (
        {
          minX: currentMinX,
          maxX: currentMaxX,
          minY: currentMinY,
          maxY: currentMaxY,
        },
        { x, y },
      ) => {
        const retval: {
          minX: number;
          minY: number;
          maxX: number;
          maxY: number;
        } = { minX: NaN, minY: NaN, maxX: NaN, maxY: NaN };
        if (isNaN(currentMinX) || currentMinX > x) {
          retval.minX = x;
        } else {
          retval.minX = currentMinX;
        }
        if (isNaN(currentMaxX) || currentMaxX < x) {
          retval.maxX = x;
        } else {
          retval.maxX = currentMaxX;
        }
        if (isNaN(currentMinY) || currentMinY > y) {
          retval.minY = y;
        } else {
          retval.minY = currentMinY;
        }
        if (isNaN(currentMaxY) || currentMaxY < y) {
          retval.maxY = y;
        } else {
          retval.maxY = currentMaxY;
        }
        return retval;
      },
      { minX: NaN, maxX: NaN, minY: NaN, maxY: NaN },
    );
    const viewBoxMaxX = 100 * aspectRatio;

    const convertData = data.map((dataPoint) => {
      return {
        x: convertX(dataPoint.x, minX, maxX, viewBoxMaxX),
        y: convertY(dataPoint.y, minY, maxY),
        key: dataPoint.key,
        type: dataPoint.type,
        color: dataPoint.color,
      };
    });

    return {
      minX,
      maxX,
      minY,
      maxY,
      convertData,
      viewBoxMaxX,
    };
  }

  componentDidMount() {
    if (this.svgContainer.current) {
      this.svgContainer.current.addEventListener('mousedown', this.mouseDown);
      this.svgContainer.current.addEventListener('mousemove', this.mouseMove);
      this.svgContainer.current.addEventListener('mouseup', this.mouseUp);
    }
  }

  componentWillUnmount() {
    if (this.svgContainer.current) {
      this.svgContainer.current.removeEventListener(
        'mousedown',
        this.mouseDown,
      );
      this.svgContainer.current.removeEventListener(
        'mousemove',
        this.mouseMove,
      );
      this.svgContainer.current.removeEventListener('mouseup', this.mouseUp);
    }
  }

  mouseDown({ clientX, clientY }: MouseEvent) {
    if (this.svgContainer.current) {
      const domRec = this.svgContainer.current.getBoundingClientRect();
      this.setState({
        rectangleX1: clientX - domRec.left,
        rectangleY1: clientY - domRec.top,
        rectangleX2: clientX - domRec.left,
        rectangleY2: clientY - domRec.top,
        drawing: true,
      });
    }
  }

  mouseMove({ clientX, clientY }: MouseEvent) {
    if (this.svgContainer.current) {
      const domRec = this.svgContainer.current.getBoundingClientRect();
      const { drawing } = this.state;
      if (drawing) {
        this.setState({
          rectangleX2: clientX - domRec.left,
          rectangleY2: clientY - domRec.top,
        });
      }
    }
  }

  mouseUp({ clientX, clientY }: MouseEvent) {
    const { rectangleX1, rectangleY1, convertData, viewBoxMaxX } = this.state;
    const { onSelect } = this.props;

    if (this.svgContainer.current) {
      const container = this.svgContainer.current.getBoundingClientRect();
      const rectangleX2 = clientX - container.left;
      const rectangleY2 = clientY - container.top;
      if (rectangleX1 !== rectangleX2 && rectangleY1 !== rectangleY2) {
        this.setState({
          rectangleX2,
          rectangleY2,
          drawing: false,
        });
        if (onSelect) {
          const lowerBoundX =
            (Math.min(rectangleX1, rectangleX2) / container.width) *
              (this.extra * 2 + viewBoxMaxX) -
            this.extra;
          const upperBoundX =
            (Math.max(rectangleX1, rectangleX2) / container.width) *
              (this.extra * 2 + viewBoxMaxX) -
            this.extra;
          const lowerBoundY =
            (Math.min(rectangleY1, rectangleY2) / container.height) *
              (this.extra * 2 + 100) -
            this.extra;
          const upperBoundY =
            (Math.max(rectangleY1, rectangleY2) / container.height) *
              (this.extra * 2 + 100) -
            this.extra;
          const selectedKeys = convertData
            .filter((dataPoint) => {
              return (
                lowerBoundX < dataPoint.x &&
                dataPoint.x < upperBoundX &&
                lowerBoundY < dataPoint.y &&
                dataPoint.y < upperBoundY
              );
            })
            .map((dataPoint) => {
              return dataPoint.key;
            });
          onSelect(selectedKeys);
        }
      } else {
        this.setState({
          rectangleX1: 0,
          rectangleY1: 0,
          rectangleX2: 0,
          rectangleY2: 0,
          drawing: false,
        });
        onSelect(
          convertData.map((dataPoint) => {
            return dataPoint.key;
          }),
        );
      }
    }
  }

  render() {
    const {
      xLabel,
      yLabel,
      aspectRatio,
      width,
      title,
      xSteps,
      ySteps,
    } = this.props;

    const {
      rectangleX1,
      rectangleX2,
      rectangleY1,
      rectangleY2,
      viewBoxMaxX,
      minX,
      maxX,
      minY,
      maxY,
      convertData,
    } = this.state;

    const height = this.svgContainer.current
      ? this.svgContainer.current.getBoundingClientRect().height
      : 0;

    return (
      <Container>
        <div style={{ display: 'flex', flexDirection: 'row-reverse' }}>
          <div
            style={{
              display: 'flex',
              flex: 1,
              justifyContent: 'center',
            }}
          >
            {title}
          </div>
        </div>
        <div style={{ display: 'flex' }}>
          <YLabelDiv>
            <div style={{ marginRight: '15px' }}>{yLabel}</div>
            <YAxisDiv>
              {range(ySteps + 1).map((v) => {
                return <div key={v}>{minY + (v * (maxY - minY)) / ySteps}</div>;
              })}
            </YAxisDiv>
          </YLabelDiv>
          <div
            draggable={false}
            style={{
              userSelect: 'none',
              width: `${width}px`,
              position: 'relative',
            }}
            ref={this.svgContainer}
          >
            <svg
              style={{ width: '100%', display: 'block' }}
              viewBox={`${0 - this.extra} ${0 - this.extra} ${viewBoxMaxX +
                this.extra * 2} ${100 + this.extra * 2}`}
            >
              {range(ySteps + 1).map((v) => {
                return (
                  <line
                    key={v}
                    x1="0"
                    y1={(v * 100) / ySteps}
                    x2={viewBoxMaxX}
                    y2={(v * 100) / ySteps}
                    strokeWidth={0.25}
                    stroke="#aaacaf"
                  />
                );
              })}
              {range(xSteps + 1).map((v) => {
                return (
                  <line
                    key={v}
                    y1="0"
                    x1={(v * viewBoxMaxX) / xSteps}
                    y2="100"
                    x2={(v * viewBoxMaxX) / xSteps}
                    strokeWidth={0.25}
                    stroke="#aaacaf"
                  />
                );
              })}
              {convertData.map((dataPoint) => {
                return (
                  <DataPoint
                    key={dataPoint.key}
                    type={convertType(dataPoint.type)}
                    x={dataPoint.x}
                    y={dataPoint.y}
                    color={dataPoint.color}
                  />
                );
              })}
              <SelectionRectangle
                pos={{
                  rectangleX1:
                    (rectangleX1 / width) * (this.extra * 2 + viewBoxMaxX) -
                    this.extra,
                  rectangleX2:
                    (rectangleX2 / width) * (this.extra * 2 + viewBoxMaxX) -
                    this.extra,
                  rectangleY1:
                    (rectangleY1 / height) * (this.extra * 2 + 100) -
                    this.extra,
                  rectangleY2:
                    (rectangleY2 / height) * (this.extra * 2 + 100) -
                    this.extra,
                }}
              />
            </svg>
            {range(xSteps + 1).map((v) => {
              return (
                <div
                  style={{
                    position: 'absolute',
                    bottom: `${-20}px`,
                    left: `${(((v * viewBoxMaxX) / xSteps + this.extra) /
                      (this.extra * 2 + viewBoxMaxX)) *
                      width}px`,
                    transform: 'translateX(-50%)',
                  }}
                  key={`${v}-label`}
                >
                  {minX + (v * (maxX - minX)) / xSteps}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'row-reverse' }}>
          <div style={{ width: `${width}px` }}>
            <div
              style={{
                marginTop: '20px',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              {xLabel}
            </div>
          </div>
        </div>
      </Container>
    );
  }
}

interface ScatterChartState {
  rectangleX1: number;
  rectangleX2: number;
  rectangleY1: number;
  rectangleY2: number;
  drawing: boolean;
  viewBoxMaxX: number;
  convertData: InternalDataPointType[];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface ScatterChartProps {
  aspectRatio: number;
  width: number;
  title: string;
  xLabel: string;
  yLabel: string;
  xSteps: number;
  ySteps: number;
  onSelect: Function;
  data: DataPointType[];
}

export default ScatterChart;
