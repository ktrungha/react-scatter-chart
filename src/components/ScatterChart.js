import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
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
  height: ${props => `${props.height}px`};
`;

const YAxisDiv = styled.div`
  margin-right: 10px;
  display: flex;
  flex-direction: column-reverse;
  align-items: flex-end;
  justify-content: space-between;
  height: 100%;
`;

const XAxisDiv = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`;

function convertX(x, minX, maxX, viewBoxMaxX) {
  return ((x - minX) / (maxX - minX)) * viewBoxMaxX;
}

function convertY(y, minY, maxY) {
  return 100 - ((y - minY) / (maxY - minY)) * 100;
}

function convertType(type) {
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
  return null;
}

function DataPoint({ type, x, y, color, onClick }) {
  const size = 1.5;
  if (type === DATA_POINT_TYPE_CIRCLE) {
    return (
      <circle
        draggable={false}
        cx={x}
        cy={y}
        r={size}
        fill={color}
        onClick={onClick}
      />
    );
  }
  if (type === DATA_POINT_TYPE_SQUARE) {
    return (
      <polygon
        draggable={false}
        points={`${x - size} ${y - size}, ${x + size} ${y - size}, ${x +
          size} ${y + size}, ${x - size} ${y + size}`}
        fill={color}
        onClick={onClick}
      />
    );
  }
  if (type === DATA_POINT_TYPE_TRIANGLE) {
    const triangleSize = size * 1.5;
    return (
      <polygon
        draggable={false}
        points={`${x} ${y - triangleSize}, ${x + triangleSize * 0.866} ${y +
          triangleSize * 0.5}, ${x - triangleSize * 0.866} ${y +
          triangleSize * 0.5}`}
        fill={color}
        onClick={onClick}
      />
    );
  }
  if (type === DATA_POINT_TYPE_DIAMOND) {
    return (
      <polygon
        draggable={false}
        points={`${x} ${y - 2 * size * 0.707}, ${x +
          2 * size * 0.707} ${y}, ${x} ${y + 2 * size * 0.707}, ${x -
          2 * size * 0.707} ${y}`}
        fill={color}
        onClick={onClick}
      />
    );
  }
  return <div />;
}

DataPoint.defaultProps = {
  color: '#e0a31f',
  onClick: undefined,
};

DataPoint.propTypes = {
  type: PropTypes.string.isRequired,
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  color: PropTypes.string,
  onClick: PropTypes.func,
};

function SelectionRectangle({ pos }) {
  const { rectangleX1, rectangleX2, rectangleY1, rectangleY2 } = pos;
  if (!rectangleX1 || !rectangleX2 || !rectangleY1 || !rectangleY2) {
    return <div />;
  }
  return (
    <div
      draggable={false}
      style={{
        position: 'absolute',
        top: Math.min(rectangleY1, rectangleY2),
        left: Math.min(rectangleX1, rectangleX2),
        width: Math.abs(rectangleX1 - rectangleX2),
        height: Math.abs(rectangleY1 - rectangleY2),
        backgroundColor: 'grey',
        opacity: 0.2,
      }}
    />
  );
}

SelectionRectangle.propTypes = {
  pos: PropTypes.shape({}).isRequired,
};

class ScatterChart extends React.PureComponent {
  constructor(props) {
    super(props);

    this.svgContainer = React.createRef();
    this.extra = 2;

    this.state = {};
    this.mouseDown = this.mouseDown.bind(this);
    this.mouseMove = throttle(this.mouseMove.bind(this), 100, {
      trailing: true,
    });
    this.mouseUp = this.mouseUp.bind(this);
  }

  static getDerivedStateFromProps(props) {
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
        const retval = {};
        if (currentMinX === undefined || currentMinX > x) {
          retval.minX = x;
        } else {
          retval.minX = currentMinX;
        }
        if (currentMaxX === undefined || currentMaxX < x) {
          retval.maxX = x;
        } else {
          retval.maxX = currentMaxX;
        }
        if (currentMinY === undefined || currentMinY > y) {
          retval.minY = y;
        } else {
          retval.minY = currentMinY;
        }
        if (currentMaxY === undefined || currentMaxY < y) {
          retval.maxY = y;
        } else {
          retval.maxY = currentMaxY;
        }
        return retval;
      },
      {},
    );
    const viewBoxMaxX = 100 * aspectRatio;

    const convertData = data.map(dataPoint => ({
      x: convertX(dataPoint.x, minX, maxX, viewBoxMaxX),
      y: convertY(dataPoint.y, minY, maxY),
      key: dataPoint.key,
      type: dataPoint.type,
    }));

    return { minX, maxX, minY, maxY, convertData, viewBoxMaxX };
  }

  componentDidMount() {
    this.svgContainer.current.addEventListener('mousedown', this.mouseDown);
    this.svgContainer.current.addEventListener('mousemove', this.mouseMove);
    this.svgContainer.current.addEventListener('mouseup', this.mouseUp);
  }

  componentWillUnmount() {
    this.svgContainer.current.removeEventListener('mousedown', this.mouseDown);
    this.svgContainer.current.removeEventListener('mousemove', this.mouseMove);
    this.svgContainer.current.removeEventListener('mouseup', this.mouseUp);
  }

  mouseDown({ clientX, clientY }) {
    const domRec = this.svgContainer.current.getBoundingClientRect();
    this.setState({
      rectangleX1: clientX - domRec.x,
      rectangleY1: clientY - domRec.y,
      rectangleX2: undefined,
      rectangleY2: undefined,
      drawing: true,
    });
  }

  mouseMove({ clientX, clientY }) {
    const domRec = this.svgContainer.current.getBoundingClientRect();
    const { drawing } = this.state;
    if (drawing) {
      this.setState({
        rectangleX2: clientX - domRec.x,
        rectangleY2: clientY - domRec.y,
      });
    }
  }

  mouseUp({ clientX, clientY }) {
    const { rectangleX1, rectangleY1, convertData, viewBoxMaxX } = this.state;
    const { onSelect } = this.props;

    const container = this.svgContainer.current.getBoundingClientRect();
    const rectangleX2 = clientX - container.x;
    const rectangleY2 = clientY - container.y;
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
          .filter(
            dataPoint =>
              lowerBoundX < dataPoint.x &&
              dataPoint.x < upperBoundX &&
              lowerBoundY < dataPoint.y &&
              dataPoint.y < upperBoundY,
          )
          .map(dataPoint => dataPoint.key);
        onSelect(selectedKeys);
      }
    } else {
      this.setState({
        rectangleX2: undefined,
        rectangleY2: undefined,
        drawing: false,
      });
    }
  }

  render() {
    const {
      xLabel,
      yLabel,
      aspectRatio,
      height,
      title,
      xSteps,
      ySteps,
    } = this.props;
    const width = height * aspectRatio;

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

    return (
      <Container>
        <div style={{ display: 'flex', flexDirection: 'row-reverse' }}>
          <div
            style={{
              width: `${width}px`,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            {title}
          </div>
        </div>
        <div style={{ display: 'flex' }}>
          <YLabelDiv height={height}>
            <div style={{ marginRight: '10px' }}>{yLabel}</div>
            <YAxisDiv>
              {[...Array(ySteps + 1).keys()].map(v => (
                <div key={v}>{minY + (v * (maxY - minY)) / ySteps}</div>
              ))}
            </YAxisDiv>
          </YLabelDiv>
          <div
            draggable={false}
            style={{
              height: `${height}px`,
              width: `${width}px`,
              position: 'relative',
            }}
            ref={this.svgContainer}
          >
            <svg
              draggable={false}
              viewBox={`${0 - this.extra} ${0 - this.extra} ${viewBoxMaxX +
                this.extra * 2} ${100 + this.extra * 2}`}
            >
              {[...Array(ySteps + 1).keys()].map(v => (
                <line
                  key={v}
                  x1="0"
                  y1={(v * 100) / ySteps}
                  x2={viewBoxMaxX}
                  y2={(v * 100) / ySteps}
                  strokeWidth={0.25}
                  stroke="#aaacaf"
                />
              ))}
              {[...Array(xSteps + 1).keys()].map(v => (
                <line
                  key={v}
                  y1="0"
                  x1={(v * viewBoxMaxX) / xSteps}
                  y2="100"
                  x2={(v * viewBoxMaxX) / xSteps}
                  strokeWidth={0.25}
                  stroke="#aaacaf"
                />
              ))}
              {convertData.map(dataPoint => (
                <DataPoint
                  key={dataPoint.key}
                  type={convertType(dataPoint.type)}
                  x={dataPoint.x}
                  y={dataPoint.y}
                  onClick={() =>
                    this.setState({
                      x: this.props.data[dataPoint.key].x,
                      y: this.props.data[dataPoint.key].y,
                      cx: dataPoint.x,
                      cy: dataPoint.y,
                    })
                  }
                />
              ))}
            </svg>
            {
              <SelectionRectangle
                pos={{ rectangleX1, rectangleX2, rectangleY1, rectangleY2 }}
              />
            }
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'row-reverse' }}>
          <div style={{ width: `${width}px` }}>
            <XAxisDiv>
              {[...Array(xSteps + 1).keys()].map(v => (
                <div key={v}>{minX + (v * (maxX - minX)) / xSteps}</div>
              ))}
            </XAxisDiv>
            <div
              style={{
                marginTop: '10px',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              {xLabel}
            </div>
          </div>
        </div>
        {/* <div>
          <div>X :{this.state.x}</div>
          <div>Y: {this.state.y}</div>
          <div>converX :{this.state.cx}</div>
          <div>convertY: {this.state.cy}</div>
          <div>maxX :{maxX}</div>
          <div>maxY: {maxY}</div>
          <div>minX :{minX}</div>
          <div>minY: {minY}</div>
        </div> */}
      </Container>
    );
  }
}

ScatterChart.defaultProps = {
  aspectRatio: 1,
  height: 300,
  xSteps: 10,
  ySteps: 10,
  data: [],
  onSelect: undefined,
};

ScatterChart.propTypes = {
  aspectRatio: PropTypes.number,
  height: PropTypes.number,
  title: PropTypes.string.isRequired,
  xLabel: PropTypes.string.isRequired,
  yLabel: PropTypes.string.isRequired,
  xSteps: PropTypes.number,
  ySteps: PropTypes.number,
  data: PropTypes.arrayOf(PropTypes.object),
  onSelect: PropTypes.func,
};

export default ScatterChart;
