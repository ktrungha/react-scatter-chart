import React from 'react';
import styled from 'styled-components';
import ScatterChart, { DataPointType } from './components/ScatterChart';

const colors = ['#ff5722', '#2196f3', '#4caf50', '#673ab7'];

const Input = styled.input`
  width: 100px;
  padding: 3px;
`;

const Field = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin: 10px;
`;

interface State {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  count: number;
  data: DataPointType[];
  selectedKeys: number[];
}

class App extends React.Component<{}, State> {
  constructor(props: {}) {
    super(props);
    this.state = {
      minX: 0,
      minY: 0,
      maxX: 100,
      maxY: 100,
      count: 20,
      data: [],
      selectedKeys: [],
    };

    this.onSelect = this.onSelect.bind(this);
  }

  onSelect(keys: number[]) {
    this.setState({ selectedKeys: keys });
  }

  render() {
    const { minX, maxX, minY, maxY, count, selectedKeys, data } = this.state;
    return (
      <div style={{ padding: '10px' }}>
        <div style={{ textAlign: 'center', margin: '10px' }}>
          This is a scatter chart where you can draw rectangle to select data
          points
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            width: 'fit-content',
            margin: 'auto',
          }}
        >
          <div
            style={{
              width: '300px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div style={{ textAlign: 'center', margin: '20px' }}>
              Generate data
            </div>
            <Field>
              Number of points:{' '}
              <Input
                value={count}
                type="number"
                onChange={(event) => {
                  this.setState({
                    count: Number(event.target.value),
                  });
                }}
              />
            </Field>
            <Field>
              min X:{' '}
              <Input
                value={minX}
                type="number"
                onChange={(event) => {
                  this.setState({
                    minX: Number(event.target.value),
                  });
                }}
              />
            </Field>
            <Field>
              max X:{' '}
              <Input
                value={maxX}
                type="number"
                onChange={(event) => {
                  this.setState({
                    maxX: Number(event.target.value),
                  });
                }}
              />
            </Field>
            <Field>
              min Y:{' '}
              <Input
                value={minY}
                type="number"
                onChange={(event) => {
                  this.setState({
                    minY: Number(event.target.value),
                  });
                }}
              />
            </Field>
            <Field>
              max Y:{' '}
              <Input
                value={maxY}
                type="number"
                onChange={(event) => {
                  this.setState({
                    maxY: Number(event.target.value),
                  });
                }}
              />
            </Field>
            <div style={{ textAlign: 'center', margin: '20px' }}>
              <button
                type="submit"
                onClick={() => {
                  const range: number[] = [];
                  for (let i = 0; i < count; i += 1) {
                    range.push(i);
                  }
                  const randomData = range.map((index) => {
                    return {
                      key: index,
                      x: Math.round(Math.random() * (maxX - minX) + minX),
                      y: Math.round(Math.random() * (maxY - minY) + minY),
                      type: Math.floor(Math.random() * 4),
                      color: colors[Math.floor(Math.random() * 4)],
                    };
                  });
                  this.setState({ data: randomData });
                }}
              >
                Generate
              </button>
            </div>
          </div>
          <div
            style={{
              padding: '25px',
            }}
          >
            <ScatterChart
              title="Chart title"
              xLabel="X"
              yLabel="Y"
              height={400}
              aspectRatio={1}
              xSteps={5}
              ySteps={5}
              data={data}
              onSelect={this.onSelect}
            />
          </div>
          <div
            style={{
              width: '400px',
              padding: '15px',
            }}
          >
            <div>Selected Points:</div>
            {selectedKeys &&
              data
                .filter((value) => {
                  return selectedKeys.indexOf(value.key) !== -1;
                })
                .map((value) => {
                  const { x, y, key } = value;
                  return (
                    <div key={key}>
                      x:
                      {x}; y:
                      {y}; key:
                      {key}
                    </div>
                  );
                })}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div>Data points:</div>
          {data.map((dataPoint) => {
            return (
              <div style={{ margin: '5px' }}>
                x:{' '}
                <Input
                  value={dataPoint.x}
                  type="number"
                  onChange={(event) => {
                    data[dataPoint.key].x = Number(event.target.value);
                    this.setState({ data });
                  }}
                />{' '}
                &nbsp; y:{' '}
                <Input
                  value={dataPoint.y}
                  type="number"
                  onChange={(event) => {
                    data[dataPoint.key].y = Number(event.target.value);
                    this.setState({ data });
                  }}
                />{' '}
                &nbsp; key:
                {dataPoint.key}
                ,&nbsp; color:
                <span
                  style={{
                    marginLeft: '5px',
                    width: '10px',
                    height: '10px',
                    display: 'inline-block',
                    backgroundColor: dataPoint.color,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}

export default App;
