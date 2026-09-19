import React, { useState } from "react";
import BlogList from "./blog/BlogList";
import BlogEditor from "./blog/BlogEditor";

export default function BlogManager() {
  const [view, setView] = useState("list"); // 'list' or 'editor'
  const [currentPost, setCurrentPost] = useState(null);

  const handleNewPost = () => {
    setCurrentPost(null);
    setView("editor");
  };

  const handleEditPost = (post) => {
    setCurrentPost(post);
    setView("editor");
  };

  const handleAiGeneratedPost = (aiData) => {
    setCurrentPost({
      title: aiData.title || "",
      slug: aiData.slug || "",
      excerpt: aiData.excerpt || "",
      content: aiData.content || "",
      category: aiData.category || "Influencer Marketing",
      tags: aiData.tags || [],
      meta_title: aiData.meta_title || "",
      meta_description: aiData.meta_description || "",
      ai_generated: true
    });
    setView("editor");
  };

  const handleBackToList = () => {
    setCurrentPost(null);
    setView("list");
  };

  const handlePostSaved = () => {
    setView("list");
    setCurrentPost(null);
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Blog Manager</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Manage and publish articles to the public blog.</p>
        </div>
      </div>

      {view === "list" ? (
        <BlogList
          onNewPost={handleNewPost}
          onEditPost={handleEditPost}
          onAiGeneratedPost={handleAiGeneratedPost}
        />
      ) : (
        <BlogEditor
          post={currentPost}
          onBack={handleBackToList}
          onSaved={handlePostSaved}
        />
      )}
    </div>
  );
}
