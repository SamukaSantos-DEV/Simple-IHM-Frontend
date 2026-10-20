import ReactECharts from 'echarts-for-react';

export default function LiveMetricChart({ data, title, darkMode }: { data: number[], title: string, darkMode: boolean }) {
  const textColor = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';
  const gridColor = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
  const option = {
    backgroundColor: 'transparent',
    title: {
      text: title,
      textStyle: { color: textColor, fontSize: 12, fontWeight: 'normal' },
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: darkMode ? '#1a1a1a' : '#fff',
      borderColor: gridColor,
      textStyle: { color: darkMode ? '#fff' : '#000' }
    },
    grid: {
      top: '20%',
      left: '5%',
      right: '5%',
      bottom: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      show: true,
      axisLine: { lineStyle: { color: gridColor } },
      axisLabel: { show: false }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: gridColor } },
      axisLabel: { color: textColor }
    },
    series: [{
      data: data,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      itemStyle: { color: '#5CE1E6' },
      lineStyle: { width: 2, color: '#5CE1E6' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(92, 225, 230, 0.3)' },
            { offset: 1, color: 'rgba(92, 225, 230, 0)' }
          ]
        }
      }
    }]
  };

  return <ReactECharts option={option} style={{ height: '200px' }} />;
}
