import React from 'react';

const testimonials = [
  {
    quote: "Incredible Experience! We've been using ECHO for our team's daily standups and it's so much better than email chains! The real-time chat is so fast and reliable.",
    author: "Sarah Peterson",
    role: "Tech Lead, Innovate Inc"
  },
  {
    quote: "Dependable, Responsive & Professional! ECHO has been a game-changer for our remote team. The video chat quality is exceptional and the interface is intuitive.",
    author: "Michael Chang",
    role: "CTO, FutureScale"
  }
];

export default function Testimonials() {
  return (
    <section className="bg-orange-500 px-8 py-16">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          Our blessed client said about us ✨
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-lg"
            >
              <blockquote>
                <p className="text-gray-700 text-lg leading-relaxed">
                  "{testimonial.quote}"
                </p>
                <footer className="mt-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        {testimonial.author[0]}
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-base font-semibold text-gray-900">
                        {testimonial.author}
                      </div>
                      <div className="text-sm text-gray-600">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                </footer>
              </blockquote>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 