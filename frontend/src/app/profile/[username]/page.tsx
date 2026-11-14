"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch, apiUrl } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { RecipeCard } from "@/components/RecipeCard";
import type { PublicProfile, Recipe } from "@/lib/types";

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { user, updateProfile } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [tab, setTab] = useState<"uploaded" | "saved">("uploaded");
  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState("");

  const isOwnProfile = user?.username === username;

  useEffect(() => {
    apiFetch<{ profile: PublicProfile }>(`/api/users/${username}`).then((res) => {
      setProfile(res.profile);
      setBioDraft(res.profile.bio ?? "");
    });
    apiFetch<{ recipes: Recipe[] }>(`/api/users/${username}/recipes`).then((res) => setRecipes(res.recipes));
  }, [username]);

  useEffect(() => {
    if (isOwnProfile) {
      apiFetch<{ recipes: Recipe[] }>("/api/users/saved").then((res) => setSavedRecipes(res.recipes));
    }
  }, [isOwnProfile]);

  async function toggleFollow() {
    if (!profile) return;
    if (profile.isFollowing) {
      await apiFetch(`/api/users/${username}/follow`, { method: "DELETE" });
    } else {
      await apiFetch(`/api/users/${username}/follow`, { method: "POST" });
    }
    const delta = profile.isFollowing ? -1 : 1;
    setProfile({
      ...profile,
      isFollowing: !profile.isFollowing,
      _count: { ...profile._count, followers: profile._count.followers + delta },
    });
  }

  async function saveBio() {
    await updateProfile({ bio: bioDraft });
    setProfile((prev) => (prev ? { ...prev, bio: bioDraft } : prev));
    setEditingBio(false);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("avatar", file);
    const res = await apiFetch<{ avatarUrl: string }>("/api/users/avatar", { method: "POST", body: formData, isFormData: true });
    setProfile((prev) => (prev ? { ...prev, avatarUrl: res.avatarUrl } : prev));
  }

  async function toggle2fa() {
    if (!user) return;
    await updateProfile({ twoFactorEnabled: !user.twoFactorEnabled });
  }

  if (!profile) return <p className="text-ink-soft">Loading...</p>;

  const shownRecipes = tab === "uploaded" ? recipes : savedRecipes;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile.avatarUrl ? apiUrl(profile.avatarUrl) : "/avatar-placeholder.svg"}
            alt={profile.username}
            className="h-24 w-24 rounded-full border-4 border-white object-cover shadow"
          />
          {isOwnProfile && (
            <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-terracotta px-2 py-1 text-xs text-cream">
              +
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
          )}
        </div>
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-semibold">{profile.username}</h1>
          {editingBio ? (
            <div className="mt-2 flex flex-col gap-2">
              <Textarea value={bioDraft} onChange={(e) => setBioDraft(e.target.value)} rows={2} />
              <div className="flex gap-2">
                <Button onClick={saveBio}>Save</Button>
                <Button variant="ghost" onClick={() => setEditingBio(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-ink-soft">{profile.bio || "No bio yet."}</p>
          )}

          <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-ink-soft sm:justify-start">
            <span>
              <strong className="text-ink">{profile._count.followers}</strong> Followers
            </span>
            <span>
              <strong className="text-ink">{profile._count.following}</strong> Following
            </span>
            <span>
              <strong className="text-ink">{profile._count.recipes}</strong> Uploaded recipes
            </span>
          </div>

          <div className="mt-3 flex justify-center gap-2 sm:justify-start">
            {isOwnProfile ? (
              <>
                {!editingBio && (
                  <Button variant="secondary" onClick={() => setEditingBio(true)}>
                    Edit profile
                  </Button>
                )}
                <Button variant={user?.twoFactorEnabled ? "primary" : "secondary"} onClick={toggle2fa}>
                  Enable two-factor authentication: {user?.twoFactorEnabled ? "On" : "Off"}
                </Button>
              </>
            ) : (
              user && (
                <>
                  <Button onClick={toggleFollow}>{profile.isFollowing ? "Unfollow" : "Follow"}</Button>
                  <Button variant="secondary" onClick={() => router.push(`/chat?with=${profile.username}`)}>
                    Message
                  </Button>
                </>
              )
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-4 flex gap-4 border-b border-ink/10">
          <button
            className={`cursor-pointer border-b-2 px-1 pb-2 text-sm font-medium ${tab === "uploaded" ? "border-terracotta text-terracotta-dark" : "border-transparent text-ink-soft"}`}
            onClick={() => setTab("uploaded")}
          >
            Uploaded recipes
          </button>
          {isOwnProfile && (
            <button
              className={`cursor-pointer border-b-2 px-1 pb-2 text-sm font-medium ${tab === "saved" ? "border-terracotta text-terracotta-dark" : "border-transparent text-ink-soft"}`}
              onClick={() => setTab("saved")}
            >
              Saved recipes
            </button>
          )}
        </div>

        {shownRecipes.length === 0 ? (
          <p className="text-ink-soft">Nothing here yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {shownRecipes.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
