import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ArrowLeft, Camera, KeyRound, Loader2, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setAuthUser } from "@/redux/authSlice";
import { getErrorMessage } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

const EditProfile = () => {
  const { user } = useSelector((store) => store.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const imageRef = useRef(null);
  const coverImageRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(user?.profilePicture || "");
  const [coverPreview, setCoverPreview] = useState(user?.coverPicture || "");
  const [coverPhoto, setCoverPhoto] = useState(null);
  const [input, setInput] = useState({
    username: user?.username || "",
    fullName: user?.fullName || "",
    bio: user?.bio || "",
    gender: user?.gender || "",
    dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.slice(0, 10) : "",
    website: user?.website || "",
    profilePhoto: null,
  });

  /* ---------- LOGIC (UNCHANGED) ---------- */
  useEffect(() => {
    setInput({
      username: user?.username || "",
      fullName: user?.fullName || "",
      bio: user?.bio || "",
      gender: user?.gender || "",
      dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.slice(0, 10) : "",
      website: user?.website || "",
      profilePhoto: null,
    });
    setPhotoPreview(user?.profilePicture || "");
    setCoverPreview(user?.coverPicture || "");
    setCoverPhoto(null);
  }, [user]);

  const changeHandler = (event) => {
    setInput((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const fileChangeHandler = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile photo must be smaller than 5 MB.");
      return;
    }
    setInput((current) => ({ ...current, profilePhoto: file }));
    setPhotoPreview(URL.createObjectURL(file));
  };

  const coverChangeHandler = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Cover photo must be smaller than 5 MB.");
      return;
    }
    setCoverPhoto(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const editProfileHandler = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append("username", input.username);
    formData.append("fullName", input.fullName);
    formData.append("bio", input.bio);
    formData.append("gender", input.gender);
    formData.append("dateOfBirth", input.dateOfBirth);
    formData.append("website", input.website);
    if (input.profilePhoto) formData.append("profilePhoto", input.profilePhoto);
    if (coverPhoto) formData.append("coverPhoto", coverPhoto);

    try {
      setLoading(true);
      const res = await axios.post(
        apiUrl("/api/v1/user/profile/edit"),
        formData,
        { withCredentials: true },
      );
      if (res.data.success) {
        dispatch(setAuthUser({ ...user, ...res.data.user }));
        toast.success(res.data.message || "Profile updated successfully.");
        navigate(`/profile/${user?._id}`);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update your profile."));
    } finally {
      setLoading(false);
    }
  };

  /* ---------- UI ---------- */
  return (
    <main className="mx-auto max-w-2xl px-3 sm:px-4 py-5 animate-fade-in">
      {/* BACK */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors group"
      >
        <ArrowLeft
          className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform"
          strokeWidth={1.8}
        />
        Back
      </button>

      {/* FORM CARD */}
      <form onSubmit={editProfileHandler} className="card overflow-hidden">
        {/* HEADER */}
        <div className="px-5 py-5 border-b border-[var(--border)]">
          <h1
            className="text-2xl font-bold text-[var(--foreground)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Edit profile
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Update the details people see on your profile.
          </p>
        </div>

        <div className="p-5 space-y-6">
          <div>
            <div
              className="relative h-32 overflow-hidden rounded-xl border border-[var(--border)] bg-[linear-gradient(120deg,var(--primary),var(--primary-hover),var(--accent))] sm:h-40"
              style={
                coverPreview
                  ? {
                      backgroundImage: `url(${coverPreview})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : undefined
              }
            >
              <input
                ref={coverImageRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={coverChangeHandler}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => coverImageRef.current?.click()}
                className="absolute bottom-3 right-3 rounded-full border border-white/30 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/60"
              >
                {coverPreview ? "Change cover photo" : "Add cover photo"}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-[var(--muted-foreground)]">
              Cover photo · JPG, PNG or WEBP · max 5 MB
            </p>
          </div>

          {/* PHOTO */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 shrink-0 border-2 border-[var(--border)]">
              <AvatarImage src={photoPreview} alt={user?.username} />
              <AvatarFallback className="text-xl">
                {user?.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {user?.username ? `@${user.username}` : "Choose your username"}
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                JPG, PNG or WEBP · max 5 MB
              </p>

              <input
                ref={imageRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={fileChangeHandler}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => imageRef.current?.click()}
                className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-[var(--border-strong)] text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
              >
                <Camera className="h-3.5 w-3.5" strokeWidth={1.8} />
                Change photo
              </button>
            </div>
          </div>

          <div className="divider" />

          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/45 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Password & account safety</p>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">Reset your password or permanently delete your account.</p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/account/security")}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface)]"
              >
                <KeyRound className="h-3.5 w-3.5" /> Manage
              </button>
            </div>
          </section>

          {/* FIELDS */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="username">Username</Label>
                {!user?.username && (
                  <span className="h-2 w-2 rounded-full bg-[var(--danger)]" title="Username needed" />
                )}
              </div>
              {!user?.username && (
                <p className="text-xs text-[var(--danger)]">
                  Set a unique username to finish your profile.
                </p>
              )}
              <Input
                id="username"
                name="username"
                value={input.username}
                onChange={changeHandler}
                placeholder="Your username"
                minLength={3}
                maxLength={30}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                name="fullName"
                value={input.fullName}
                onChange={changeHandler}
                placeholder="Your full name"
                maxLength={80}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                name="website"
                type="url"
                value={input.website}
                onChange={changeHandler}
                placeholder="https://your-site.com"
                maxLength={120}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dateOfBirth">Date of birth</Label>
              <Input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                value={input.dateOfBirth}
                onChange={changeHandler}
                max={new Date().toISOString().slice(0, 10)}
                className="[color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Gender</Label>
              <Select
                value={input.gender}
                onValueChange={(gender) =>
                  setInput((current) => ({ ...current, gender }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* BIO */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="bio">Bio</Label>
              <span className="text-[11px] text-[var(--muted-foreground)] tabular-nums">
                {input.bio.length}/300
              </span>
            </div>
            <Textarea
              id="bio"
              name="bio"
              value={input.bio}
              onChange={changeHandler}
              placeholder="Tell people a little about yourself"
              maxLength={300}
              className="min-h-24 resize-none rounded-lg"
            />
          </div>

          {/* ACTIONS */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-xs font-medium px-4 py-2 rounded-full text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-5 py-2 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" strokeWidth={2} />
              )}
              {loading ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
};

export default EditProfile;
