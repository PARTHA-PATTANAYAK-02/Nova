import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowLeft,
  Camera,
  KeyRound,
  Loader2,
  Save,
  ImagePlus,
} from "lucide-react";
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
    taggingPrivacy: user?.taggingPrivacy || "everyone",
    profilePhoto: null,
  });

  useEffect(() => {
    setInput({
      username: user?.username || "",
      fullName: user?.fullName || "",
      bio: user?.bio || "",
      gender: user?.gender || "",
      dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.slice(0, 10) : "",
      website: user?.website || "",
      taggingPrivacy: user?.taggingPrivacy || "everyone",
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
    formData.append("taggingPrivacy", input.taggingPrivacy || "everyone");
    if (input.profilePhoto) formData.append("profilePhoto", input.profilePhoto);
    if (coverPhoto) formData.append("coverPhoto", coverPhoto);

    try {
      setLoading(true);
      const res = await axios.post(
        apiUrl("/api/v1/user/profile/edit"),
        formData,
        {
          withCredentials: true,
        },
      );
      if (res.data.success) {
        dispatch(setAuthUser({ ...user, ...res.data.user }));
        toast.success(res.data.message || "Profile updated successfully.");
        navigate(`/profile/${res.data?.user?.username || user?.username || user?._id}`);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update your profile."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="nova-page">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="nova-edit__back"
      >
        <ArrowLeft className="size-4" strokeWidth={1.8} />
        Back
      </button>

      <form onSubmit={editProfileHandler} className="nova-edit__form">
        <div className="nova-edit__hero">
          <button
            type="button"
            onClick={() => coverImageRef.current?.click()}
            className="nova-edit__cover"
            style={
              coverPreview
                ? { backgroundImage: `url(${coverPreview})` }
                : undefined
            }
          >
            <span className="nova-edit__cover-empty">
              <ImagePlus className="size-5" strokeWidth={1.8} />
              Cover photo
            </span>
            <span className="nova-edit__cover-badge">
              <Camera className="size-3.5" strokeWidth={2} />
              Change cover
            </span>
          </button>

          <input
            ref={coverImageRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={coverChangeHandler}
            className="hidden"
          />

          <div className="nova-edit__avatar-wrap">
            <span className="nova-edit__avatar-ring">
              <Avatar className="nova-edit__avatar">
                <AvatarImage src={photoPreview} alt={user?.username} />
                <AvatarFallback>
                  {user?.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </span>
            <button
              type="button"
              onClick={() => imageRef.current?.click()}
              className="nova-edit__avatar-btn"
              aria-label="Change photo"
            >
              <Camera className="size-4" strokeWidth={2.2} />
            </button>
            <input
              ref={imageRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={fileChangeHandler}
              className="hidden"
            />
          </div>
        </div>

        <div className="nova-edit__head">
          <h1 className="nova-edit__title">Edit profile</h1>
          <p className="nova-edit__sub">
            Update the details people see on your profile.
          </p>
        </div>

        <div className="nova-edit__body">
          <div className="nova-edit__grid">
            <div className="nova-edit__field">
              <Label htmlFor="username">
                Username
                {!user?.username && (
                  <span className="ml-1.5 inline-block size-1.5 rounded-full bg-[var(--danger)]" />
                )}
              </Label>
              {!user?.username && (
                <p className="nova-edit__hint is-danger">
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

            <div className="nova-edit__field">
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

            <div className="nova-edit__field">
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

            <div className="nova-edit__field">
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

            <div className="nova-edit__field nova-edit__field--full">
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

            <div className="nova-edit__field nova-edit__field--full">
              <Label>Who can tag you</Label>
              <Select
                value={input.taggingPrivacy || "everyone"}
                onValueChange={(taggingPrivacy) =>
                  setInput((current) => ({ ...current, taggingPrivacy }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Who can tag you in posts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">Everyone (Anyone can tag you)</SelectItem>
                  <SelectItem value="following">People you follow only</SelectItem>
                  <SelectItem value="no_one">No one (Disallow tagging)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="nova-edit__field">
            <div className="nova-edit__field-head">
              <Label htmlFor="bio">Bio</Label>
              <span className="nova-edit__counter">{input.bio.length}/300</span>
            </div>
            <Textarea
              id="bio"
              name="bio"
              value={input.bio}
              onChange={changeHandler}
              placeholder="Tell people a little about yourself"
              maxLength={300}
              className="min-h-24 resize-none"
            />
          </div>

          <div className="nova-edit__security">
            <div className="nova-edit__security-orb">
              <KeyRound className="size-4" strokeWidth={2} />
            </div>
            <div className="nova-edit__security-text">
              <p className="nova-edit__security-title">
                Password & account safety
              </p>
              <p className="nova-edit__security-sub">
                Reset password or permanently delete your account.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/account/security")}
              className="nova-edit__security-btn"
            >
              Manage
            </button>
          </div>
        </div>

        <div className="nova-edit__actions">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="nova-btn-ghost"
          >
            Cancel
          </button>
          <button type="submit" disabled={loading} className="nova-btn-primary">
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" strokeWidth={2} />
            )}
            {loading ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </main>
  );
};

export default EditProfile;
