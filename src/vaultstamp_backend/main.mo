// ===============================
// VaultStamp Backend Canister
// ===============================
// This Motoko actor implements the backend logic for VaultStamp,
// a decentralized platform for timestamping, verifying, and protecting
// creative designs (such as logos, images, etc.) on the blockchain.
// It allows users to:
//   - Upload a design hash and associate it with their wallet and a timestamp
//   - Verify if a design hash exists and retrieve its timestamp/wallet
//   - Retrieve all uploads for a specific wallet
//   - Receive plagiarism alerts if their design is found elsewhere
//   - (For AI/automation) Report plagiarism events to the original creator
// ===============================

import Text "mo:base/Text";
import HashMap "mo:base/HashMap";
import Time "mo:base/Time";
import List "mo:base/List";
import Debug "mo:base/Debug";
import Int "mo:base/Int";

// The main actor for the VaultStamp backend
actor vaultstamp {

  // Type aliases for clarity
  type Timestamp = Int;         // Nanoseconds since epoch
  type WalletAddress = Text;    // User's wallet address (public key)
  type DesignHash = Text;       // SHA-256 hash of the design

  // Registry mapping: DesignHash -> (Timestamp, WalletAddress)
  // Used to prove ownership and timestamp of a design
  var registry = HashMap.HashMap<DesignHash, (Timestamp, WalletAddress)>(100, Text.equal, Text.hash);

  // Alerts mapping: WalletAddress -> List of plagiarism alert messages
  // Used to notify users if their design is found elsewhere
  var alerts = HashMap.HashMap<WalletAddress, List.List<Text>>(100, Text.equal, Text.hash);

  /// Uploads a new design hash to the registry.
  /// If the hash already exists, returns the existing timestamp (prevents duplicate entries).
  /// Otherwise, stores the new hash with the current timestamp and wallet address.
  public func uploadDesign(hash: DesignHash, wallet: WalletAddress) : async Timestamp {
    Debug.print("uploadDesign called with hash: " # hash # ", wallet: " # wallet);
    switch (registry.get(hash)) {
      case (?entry) {
        Debug.print("Hash already exists in registry with timestamp: " # Int.toText(entry.0));
        return entry.0; // Return existing timestamp if already uploaded
      };
      case null {
        let now = Time.now(); // Get current time in nanoseconds
        Debug.print("Storing new entry in registry with timestamp: " # Int.toText(now));
        registry.put(hash, (now, wallet)); // Store new entry
        return now;
      };
    };
  };

  /// Verifies if a design hash exists in the registry.
  /// Returns (timestamp, wallet address) if found, otherwise null.
  public query func verifyDesign(hash: DesignHash) : async ?(Timestamp, WalletAddress) {
    registry.get(hash)
  };

  /// Returns all uploads (hash, timestamp) for a given wallet address.
  /// Useful for users to see all their protected designs.
  public query func getUploadsByWallet(wallet: WalletAddress) : async [(Text, Int)] {
    var result : List.List<(Text, Int)> = List.nil();
    for ((hash, (ts, w)) in registry.entries()) {
      if (w == wallet) {
        result := List.push((hash, ts), result);
      }
    };
    return List.toArray(List.reverse(result)); // Return as array, most recent first
  };

  /// INTERNAL: Called by the AI scanner or automation to report plagiarism.
  /// If the original design hash exists, adds an alert for the owner wallet.
  /// Returns a message indicating success or failure.
  public func reportPlagiarism(originalHash: DesignHash, sourceUrl: Text) : async Text {
    switch (registry.get(originalHash)) {
      case (?(_, wallet)) {
        // Get current alerts for this wallet, or start a new list
        let currentAlerts = switch (alerts.get(wallet)) {
          case (?list) list;
          case null List.nil<Text>();
        };
        // Add new alert message to the list
        let updated = List.push("Potential plagiarism found: " # sourceUrl, currentAlerts);
        alerts.put(wallet, updated);
        return "Alert sent to wallet: " # wallet;
      };
      case null return "Hash not found.";
    };
  };

  /// Returns all plagiarism alerts for a given wallet address.
  /// Users can call this to see if their designs have been flagged elsewhere.
  public query func getAlerts(wallet: WalletAddress) : async [Text] {
    switch (alerts.get(wallet)) {
      case (?list) return List.toArray(list);
      case null return [];
    };
  };
}