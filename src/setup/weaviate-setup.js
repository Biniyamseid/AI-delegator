import client from '../config/database.js';

const CLASS_NAME = 'QuestionAnswer';
const TENANT_NAME = 'default';

async function setupWeaviate() {
  try {
    console.log('Setting up Weaviate database...');

    // Check if class already exists
    const classExists = await client.schema.exists(CLASS_NAME);
    
    if (!classExists) {
      console.log('Creating schema...');
      
      // Create the schema with multi-tenancy
      await client.schema
        .classCreator()
        .withClass({
          class: CLASS_NAME,
          description: 'Question and answer pairs with multi-tenancy support',
          multiTenancyConfig: {
            enabled: true,
          },
          properties: [
            {
              name: 'fileId',
              dataType: ['text'],
              description: 'The identifier for each file',
              indexInverted: false,
            },
            {
              name: 'question',
              dataType: ['text'],
              description: 'The question being asked',
              indexInverted: true,
            },
            {
              name: 'answer',
              dataType: ['text'],
              description: 'The answer to the question',
              indexInverted: true,
            },
          ],
        })
        .do();

      console.log('Schema created successfully!');
    } else {
      console.log('Schema already exists.');
    }

    // Create tenant if it doesn't exist
    try {
      await client.schema.tenantsCreator(CLASS_NAME, [{ name: TENANT_NAME }]).do();
      console.log('Tenant created successfully!');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('Tenant already exists.');
      } else {
        console.log('Tenant creation failed, continuing without multi-tenancy:', error.message);
      }
    }

    // Insert sample data
    console.log('Inserting sample data...');
    
    const sampleData = [
      {
        fileId: 'file_001',
        question: 'What is machine learning?',
        answer: 'Machine learning is a subset of artificial intelligence that enables computers to learn and improve from experience without being explicitly programmed. It uses algorithms to identify patterns in data and make predictions or decisions.',
      },
      {
        fileId: 'file_002',
        question: 'How does a neural network work?',
        answer: 'A neural network is a computational model inspired by biological neural networks. It consists of interconnected nodes (neurons) organized in layers. Information flows through the network, with each connection having a weight that gets adjusted during training to minimize prediction errors.',
      },
      {
        fileId: 'file_003',
        question: 'What is the difference between supervised and unsupervised learning?',
        answer: 'Supervised learning uses labeled training data to learn the relationship between inputs and outputs, while unsupervised learning finds hidden patterns in unlabeled data. Supervised learning is used for classification and regression tasks, while unsupervised learning is used for clustering and dimensionality reduction.',
      },
      {
        fileId: 'file_004',
        question: 'What are the main types of machine learning algorithms?',
        answer: 'The main types include: 1) Supervised Learning (Linear Regression, Logistic Regression, Decision Trees, Random Forest, SVM), 2) Unsupervised Learning (K-means Clustering, Hierarchical Clustering, PCA), 3) Reinforcement Learning (Q-Learning, Deep Q-Networks), and 4) Deep Learning (CNNs, RNNs, Transformers).',
      },
      {
        fileId: 'file_005',
        question: 'How do you evaluate machine learning models?',
        answer: 'Model evaluation involves metrics like accuracy, precision, recall, F1-score for classification; MSE, MAE, R-squared for regression; and cross-validation techniques to ensure robust performance. The choice of metrics depends on the specific problem and business requirements.',
      },
    ];

    for (const data of sampleData) {
      try {
        await client.data
          .creator()
          .withClassName(CLASS_NAME)
          .withTenant(TENANT_NAME)
          .withProperties(data)
          .do();
      } catch (error) {
        // If tenant fails, try without tenant
        await client.data
          .creator()
          .withClassName(CLASS_NAME)
          .withProperties(data)
          .do();
      }
    }

    console.log('Sample data inserted successfully!');
    console.log('Weaviate setup completed successfully!');

  } catch (error) {
    console.error('Error setting up Weaviate:', error);
    throw error;
  }
}

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupWeaviate()
    .then(() => {
      console.log('Setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

export default setupWeaviate; 
