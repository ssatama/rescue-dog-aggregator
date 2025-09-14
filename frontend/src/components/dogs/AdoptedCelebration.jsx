import React from "react";

export default function AdoptedCelebration({ dogName }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 p-8 shadow-2xl mb-8">
      {/* Main content */}
      <div className="relative z-10 text-center">
        {/* Celebration emojis */}
        <div className="mb-4 text-5xl">🎉 🐕 ❤️ 🏠 ✨</div>

        {/* Main congratulatory text */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Adoption Success!
        </h1>

        {/* Dog adoption message */}
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-semibold text-white mb-2">
            {dogName
              ? `${dogName} has found their forever home!`
              : "This wonderful dog has been adopted!"}{" "}
            🏡
          </h2>
          <p className="text-lg md:text-xl text-purple-100">
            This amazing pup is now living their best life with a loving family!
          </p>
        </div>

        {/* Subtle explanation */}
        <div className="text-sm text-purple-200 bg-purple-800/30 rounded-lg p-3 backdrop-blur-sm">
          <p>
            We keep this page active to celebrate our success stories and
            inspire more adoptions. Every rescue dog finding their forever home
            is worth celebrating! 🐾
          </p>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-4 left-4 text-3xl opacity-50">🎊</div>
        <div className="absolute top-4 right-4 text-3xl opacity-50">🎈</div>
        <div className="absolute bottom-4 left-8 text-2xl opacity-50">⭐</div>
        <div className="absolute bottom-4 right-8 text-2xl opacity-50">💫</div>
      </div>

      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 to-transparent pointer-events-none" />
    </div>
  );
}
