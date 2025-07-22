import Text "mo:base/Text";
import HashMap "mo:base/HashMap";
import Time "mo:base/Time";
import List "mo:base/List";
import Debug "mo:base/Debug";
import Int "mo:base/Int";

actor vaultstamp {

  type Timestamp = Int;
  type WalletAddress = Text;
  type DesignHash = Text;

  // Stores design hash => (timestamp, wallet)
  var registry = HashMap.HashMap<DesignHash, (Timestamp, WalletAddress)>(100, Text.equal, Text.hash);

  // Stores alerts per user wallet
  var alerts = HashMap.HashMap<WalletAddress, List.List<Text>>(100, Text.equal, Text.hash);

  /// Uploads a new design. If already exists, returns existing timestamp.
  public func uploadDesign(hash: DesignHash, wallet: WalletAddress) : async Timestamp {
    Debug.print("uploadDesign called with hash: " # hash # ", wallet: " # wallet);
    switch (registry.get(hash)) {
      case (?entry) {
        Debug.print("Hash already exists in registry with timestamp: " # Int.toText(entry.0));
        return entry.0;
      };
      case null {
        let now = Time.now();
        Debug.print("Storing new entry in registry with timestamp: " # Int.toText(now));
        registry.put(hash, (now, wallet));
        return now;
      };
    };
  };

  /// Verifies a design hash. Returns timestamp and wallet address if found.
  public query func verifyDesign(hash: DesignHash) : async ?(Timestamp, WalletAddress) {
    registry.get(hash)
  };

  /// Returns all uploads for a given wallet.
  public query func getUploadsByWallet(wallet: WalletAddress) : async [(Text, Int)] {
    var result : List.List<(Text, Int)> = List.nil();
    for ((hash, (ts, w)) in registry.entries()) {
      if (w == wallet) {
        result := List.push((hash, ts), result);
      }
    };
    return List.toArray(List.reverse(result));
  }; // <--- Don't forget this semicolon!

  /// INTERNAL: Called by AI scanner to report plagiarism.
  public func reportPlagiarism(originalHash: DesignHash, sourceUrl: Text) : async Text {
    switch (registry.get(originalHash)) {
      case (?(_, wallet)) {
        let currentAlerts = switch (alerts.get(wallet)) {
          case (?list) list;
          case null List.nil<Text>();
        };
        let updated = List.push("Potential plagiarism found: " # sourceUrl, currentAlerts);
        alerts.put(wallet, updated);
        return "Alert sent to wallet: " # wallet;
      };
      case null return "Hash not found.";
    };
  };

  /// Get all alerts for a designer wallet.
  public query func getAlerts(wallet: WalletAddress) : async [Text] {
    switch (alerts.get(wallet)) {
      case (?list) return List.toArray(list);
      case null return [];
    };
  };
}