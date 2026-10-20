import ReactECharts from 'echarts-for-react';

export default function VibrationChart({ data, darkMode }: { data: number[], darkMode: boolean }) {
  const textColor = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';
  const gridColor = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    grid: {
      top: '10%',
      left: '3%',
      right: '4%',
      bottom: '5%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      show: false,
    },
    yAxis: {
      type: 'value',
      scale: true,
      boundaryGap: ['15%', '15%'],
      splitLine: { show: true, lineStyle: { color: gridColor } },
      axisLabel: { color: textColor }
    },
    series: [{
      data: data,
      type: 'line',
      smooth: true,
      symbol: 'none',
      lineStyle: {
        width: 3,
        color: '#812FFF'
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(129, 47, 255, 0.4)' },
            { offset: 1, color: 'rgba(92, 225, 230, 0)' }
          ]
        }
      }
    }]
  };

  return <ReactECharts option={option} style={{ height: '250px' }} />;
}
