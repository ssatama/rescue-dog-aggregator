import Layout from '../../components/layout/Layout';

export default function AboutPage() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">About Rescue Dog Aggregator</h1>
        
        <div className="prose lg:prose-xl max-w-none">
          <p>
            Rescue Dog Aggregator is an open-source web platform designed to help rescue dogs find loving forever homes.
            We bring together listings from multiple rescue organizations worldwide, making it easier for potential adopters
            to find their perfect companion.
          </p>
          
          <h2>Our Mission</h2>
          <p>
            Our mission is to increase visibility for rescue dogs and help them find homes faster, while supporting
            the original rescue organizations by directing qualified adopters to them.
          </p>
          
          <h2>How It Works</h2>
          <p>
            We gather information from partner rescue organizations, standardize it, and present it in a
            user-friendly interface. When you find a dog you're interested in, you'll be directed to the
            original organization to complete the adoption process.
          </p>
          
          <h2>Our Story</h2>
          <p>
            This project started as a way to honor the rescue journey of Harley, a Golden Retriever rescued from
            Izmir, Turkey through "Pets in Turkey". We saw the need for a platform that could bring together
            rescue dogs from multiple organizations, making it easier for people to find their perfect match.
          </p>
          
          <h2>Open Source</h2>
          <p>
            Rescue Dog Aggregator is an open-source project. We believe in the power of community collaboration
            to make a difference in the lives of rescue dogs worldwide. If you're interested in contributing,
            check out our GitHub repository.
          </p>
        </div>
      </div>
    </Layout>
  );
}