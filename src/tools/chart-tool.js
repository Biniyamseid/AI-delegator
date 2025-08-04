import { Tool } from '@langchain/core/tools';

class ChartTool extends Tool {
  constructor() {
    super({
      name: 'chart_tool',
      description: 'Generates Chart.js configuration for data visualization. Use this when the user asks for charts, graphs, or data visualization.',
      schema: {
        type: 'object',
        properties: {
          chartType: {
            type: 'string',
            description: 'The type of chart to generate (line, bar, pie, doughnut, radar)',
            enum: ['line', 'bar', 'pie', 'doughnut', 'radar']
          },
          data: {
            type: 'string',
            description: 'Description of the data to visualize'
          },
          title: {
            type: 'string',
            description: 'Title for the chart'
          }
        },
        required: ['chartType', 'data', 'title']
      }
    });
  }

  async _call(input) {
    try {
      let chartType, data, title;
      
      // Handle different input formats
      if (typeof input === 'string') {
        try {
          const parsed = JSON.parse(input);
          chartType = parsed.chartType;
          data = parsed.data;
          title = parsed.title;
        } catch (e) {
          // If JSON parsing fails, use input as data
          chartType = 'bar';
          data = input;
          title = 'Chart';
        }
      } else if (input && typeof input === 'object') {
        // Handle object input
        chartType = input.chartType;
        data = input.data;
        title = input.title;
      } else {
        // Fallback
        chartType = 'bar';
        data = 'Data';
        title = 'Chart';
      }
      
      // Set defaults if any are missing
      chartType = chartType || 'bar';
      data = data || 'Data';
      title = title || 'Chart';
      
      console.log('Chart tool input:', { chartType, data, title });
      
      // Generate mock data based on chart type
      const mockData = this.generateMockData(chartType, data);
      
      // Create Chart.js configuration
      const chartConfig = {
        type: chartType,
        data: mockData,
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: title,
              font: {
                size: 16,
                weight: 'bold'
              }
            },
            legend: {
              display: true,
              position: 'top'
            }
          },
          scales: chartType !== 'pie' && chartType !== 'doughnut' ? {
            y: {
              beginAtZero: true
            }
          } : undefined
        }
      };

      return JSON.stringify({
        success: true,
        chartConfig,
        message: `Generated ${chartType} chart configuration for: ${title}`
      });

    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to generate chart configuration'
      });
    }
  }

  generateMockData(chartType, dataDescription) {
    const baseData = {
      labels: ['January', 'February', 'March', 'April', 'May', 'June'],
      datasets: []
    };

    switch (chartType) {
      case 'line':
        baseData.datasets = [
          {
            label: 'Dataset 1',
            data: [65, 59, 80, 81, 56, 55],
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.1
          },
          {
            label: 'Dataset 2',
            data: [28, 48, 40, 19, 86, 27],
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            tension: 0.1
          }
        ];
        break;

      case 'bar':
        baseData.datasets = [
          {
            label: 'Sales',
            data: [12, 19, 3, 5, 2, 3],
            backgroundColor: [
              'rgba(255, 99, 132, 0.2)',
              'rgba(54, 162, 235, 0.2)',
              'rgba(255, 206, 86, 0.2)',
              'rgba(75, 192, 192, 0.2)',
              'rgba(153, 102, 255, 0.2)',
              'rgba(255, 159, 64, 0.2)'
            ],
            borderColor: [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)',
              'rgba(255, 159, 64, 1)'
            ],
            borderWidth: 1
          }
        ];
        break;

      case 'pie':
      case 'doughnut':
        baseData.labels = ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'];
        baseData.datasets = [
          {
            data: [12, 19, 3, 5, 2, 3],
            backgroundColor: [
              'rgba(255, 99, 132, 0.8)',
              'rgba(54, 162, 235, 0.8)',
              'rgba(255, 206, 86, 0.8)',
              'rgba(75, 192, 192, 0.8)',
              'rgba(153, 102, 255, 0.8)',
              'rgba(255, 159, 64, 0.8)'
            ],
            borderWidth: 2,
            borderColor: '#fff'
          }
        ];
        break;

      case 'radar':
        baseData.labels = ['Speed', 'Reliability', 'Comfort', 'Safety', 'Efficiency', 'Durability'];
        baseData.datasets = [
          {
            label: 'Product A',
            data: [65, 59, 90, 81, 56, 55],
            fill: true,
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgb(54, 162, 235)',
            pointBackgroundColor: 'rgb(54, 162, 235)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgb(54, 162, 235)'
          },
          {
            label: 'Product B',
            data: [28, 48, 40, 19, 96, 27],
            fill: true,
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgb(255, 99, 132)',
            pointBackgroundColor: 'rgb(255, 99, 132)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgb(255, 99, 132)'
          }
        ];
        break;

      default:
        baseData.datasets = [
          {
            label: 'Default Dataset',
            data: [1, 2, 3, 4, 5, 6],
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgb(75, 192, 192)',
            borderWidth: 1
          }
        ];
    }

    return baseData;
  }
}

export default ChartTool; 
