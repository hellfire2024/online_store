
import React from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import ProductCard from '../components/ProductCard';
import Spinner from '../components/Spinner';
import { StarIcon, LayersIcon, CoffeeIcon, AwardIcon, ProductIcon as ShirtIcon } from '../components/Icons';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

const ServiceIcon: React.FC<{ name: string }> = ({ name }) => {
    const iconProps = { className: "w-10 h-10 text-sky-400" };
    if (name === 'shirt') return <ShirtIcon {...iconProps} />;
    if (name === 'award') return <AwardIcon {...iconProps} />;
    if (name === 'coffee') return <CoffeeIcon {...iconProps} />;
    return <LayersIcon {...iconProps} />;
}

const AnimatedSection: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const { ref, isIntersecting } = useIntersectionObserver({ threshold: 0.2 });
    return (
        <section ref={ref} className={`transition-all duration-700 ${isIntersecting ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {children}
        </section>
    );
};

const HomePage: React.FC = () => {
  const { products, staff, reviews, services, siteSettings } = useAdmin();
  const featuredProducts = products.slice(0, 3);
  const loading = products.length === 0;

  return (
    <div className="space-y-24">
      {/* Hero Section */}
      <section 
        className="relative text-white text-center py-32 px-4 rounded-lg overflow-hidden flex items-center justify-center min-h-[60vh] bg-cover bg-center"
        style={{backgroundImage: `url('${siteSettings.heroBackgroundImageUrl}')`}}
      >
        <div className="absolute inset-0 bg-slate-900/60"></div>
        <div className="relative z-10">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4">
            {siteSettings.heroTitle}
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto font-light">
            {siteSettings.heroSubtitle}
          </p>
          <Link 
            to="/store" 
            className="bg-sky-500 text-white font-bold py-3 px-10 rounded-full hover:bg-sky-600 transition-transform transform hover:scale-105 text-lg shadow-lg shadow-sky-500/30"
          >
            Start Designing
          </Link>
        </div>
      </section>

      {/* Services Section */}
      <AnimatedSection>
        <h2 className="text-4xl font-bold text-center text-white mb-12">Our Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {services.map(service => (
            <div key={service.id} className="bg-slate-800 p-8 rounded-lg border border-slate-700">
              <div className="flex justify-center mb-4">
                <ServiceIcon name={service.icon} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{service.title}</h3>
              <p className="text-gray-400">{service.description}</p>
            </div>
          ))}
        </div>
      </AnimatedSection>

      {/* Featured Products */}
      <AnimatedSection>
        <h2 className="text-4xl font-bold text-center text-white mb-12">Featured Products</h2>
        {loading ? (
          <Spinner />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </AnimatedSection>

      {/* Team Section */}
      <AnimatedSection>
        <h2 className="text-4xl font-bold text-center text-white mb-12">Meet the Team</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {staff.map(member => (
            <div key={member.id} className="bg-slate-800 p-6 rounded-lg border border-slate-700">
              <img src={member.imageUrl} alt={member.name} className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-slate-700" />
              <h3 className="text-xl font-semibold text-white">{member.name}</h3>
              <p className="text-sky-400">{member.role}</p>
            </div>
          ))}
        </div>
      </AnimatedSection>

      {/* Reviews Section */}
      <AnimatedSection>
        <h2 className="text-4xl font-bold text-center text-white mb-12">What Our Customers Say</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reviews.map(review => (
            <div key={review.id} className="bg-slate-800 p-6 rounded-lg border border-slate-700 flex flex-col">
              <div className="flex items-center mb-2">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} className={`w-5 h-5 ${i < review.rating ? 'text-yellow-400' : 'text-gray-600'}`} />
                ))}
              </div>
              <p className="text-gray-300 mb-4 flex-grow">"{review.text}"</p>
              <p className="font-semibold text-white text-right">- {review.author}</p>
            </div>
          ))}
        </div>
      </AnimatedSection>
    </div>
  );
};

export default HomePage;
