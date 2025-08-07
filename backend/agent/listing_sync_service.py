# """
# Listing Synchronization Service
# Background service for syncing listings with blockchain and monitoring marketplace state
# Enhanced for Phase 3.4 with advanced background services
# """
# import asyncio
# import logging
# from datetime import datetime, timedelta
# from typing import List, Dict, Any, Optional
# from uuid import UUID
# import statistics
# import json
# from sqlalchemy import func

# try:
#     from database.connection import get_db
#     from models.database import Listing, NFT, User, ListingHistory, TransactionHistory
#     from agent.sui_client import sui_client
#     from agent.supabase_client import supabase_client
#     from agent.fraud_detector import unified_fraud_detector, analyze_nft_for_fraud
# except ImportError:
#     from backend.database.connection import get_db
#     from backend.models.database import Listing, NFT, User, ListingHistory, TransactionHistory
#     from backend.agent.sui_client import sui_client
#     from backend.agent.supabase_client import supabase_client
#     from backend.agent.fraud_detector import unified_fraud_detector, analyze_nft_for_fraud

# logger = logging.getLogger(__name__)

# class ListingSyncService:
#     """
#     Background service for listing synchronization and marketplace monitoring
#     Enhanced for Phase 3.4 with advanced background services
#     """
    
#     def __init__(self):
#         self.running = False
#         self.sync_interval = 300  # 5 minutes
#         self.price_monitor_interval = 600  # 10 minutes
#         self.reconciliation_interval = 1800  # 30 minutes
#         self.analytics_interval = 3600  # 1 hour
#         self.fraud_detection_interval = 900  # 15 minutes
#         self.performance_metrics = {
#             "sync_operations": 0,
#             "price_changes_detected": 0,
#             "fraud_flags_created": 0,
#             "reconciliation_cycles": 0,
#             "analytics_updates": 0
#         }
        
#     async def start(self):
#         """Start the listing synchronization service"""
#         if self.running:
#             logger.warning("Listing sync service is already running")
#             return
        
#         self.running = True
#         logger.info("Starting enhanced listing synchronization service (Phase 3.4)")
        
#         # Start background tasks
#         asyncio.create_task(self._listing_sync_loop())
#         asyncio.create_task(self._price_monitor_loop())
#         asyncio.create_task(self._marketplace_reconciliation_loop())
#         asyncio.create_task(self._analytics_loop())
#         asyncio.create_task(self._fraud_detection_loop())
#         asyncio.create_task(self._performance_monitor_loop())
        
#     async def stop(self):
#         """Stop the listing synchronization service"""
#         self.running = False
#         logger.info("Stopping listing synchronization service")
    
#     async def _listing_sync_loop(self):
#         """Main loop for listing synchronization"""
#         while self.running:
#             try:
#                 await self._sync_pending_listings()
#                 self.performance_metrics["sync_operations"] += 1
#                 await asyncio.sleep(self.sync_interval)
#             except Exception as e:
#                 logger.error(f"Error in listing sync loop: {e}")
#                 await asyncio.sleep(60)  # Wait 1 minute before retrying
    
#     async def _price_monitor_loop(self):
#         """Enhanced price monitoring with advanced pattern detection"""
#         while self.running:
#             try:
#                 await self._monitor_price_changes()
#                 await self._detect_price_manipulation_patterns()
#                 await self._update_price_statistics()
#                 self.performance_metrics["price_changes_detected"] += 1
#                 await asyncio.sleep(self.price_monitor_interval)
#             except Exception as e:
#                 logger.error(f"Error in price monitor loop: {e}")
#                 await asyncio.sleep(60)
    
#     async def _marketplace_reconciliation_loop(self):
#         """Enhanced marketplace reconciliation with blockchain state"""
#         while self.running:
#             try:
#                 await self._reconcile_marketplace_state()
#                 await self._sync_blockchain_state()
#                 await self._cleanup_orphaned_data()
#                 self.performance_metrics["reconciliation_cycles"] += 1
#                 await asyncio.sleep(self.reconciliation_interval)
#             except Exception as e:
#                 logger.error(f"Error in marketplace reconciliation loop: {e}")
#                 await asyncio.sleep(300)  # Wait 5 minutes before retrying
    
#     async def _analytics_loop(self):
#         """Background analytics processing and reporting"""
#         while self.running:
#             try:
#                 await self._update_marketplace_analytics()
#                 await self._generate_performance_reports()
#                 await self._update_user_metrics()
#                 self.performance_metrics["analytics_updates"] += 1
#                 await asyncio.sleep(self.analytics_interval)
#             except Exception as e:
#                 logger.error(f"Error in analytics loop: {e}")
#                 await asyncio.sleep(1800)  # Wait 30 minutes before retrying
    
#     async def _fraud_detection_loop(self):
#         """Enhanced fraud detection with machine learning integration"""
#         while self.running:
#             try:
#                 await self._run_fraud_detection_analysis()
#                 await self._update_fraud_patterns()
#                 await self._flag_suspicious_activities()
#                 self.performance_metrics["fraud_flags_created"] += 1
#                 await asyncio.sleep(self.fraud_detection_interval)
#             except Exception as e:
#                 logger.error(f"Error in fraud detection loop: {e}")
#                 await asyncio.sleep(300)
    
#     async def _performance_monitor_loop(self):
#         """Monitor service performance and health"""
#         while self.running:
#             try:
#                 await self._log_performance_metrics()
#                 await self._check_service_health()
#                 await asyncio.sleep(3600)  # Every hour
#             except Exception as e:
#                 logger.error(f"Error in performance monitor loop: {e}")
#                 await asyncio.sleep(1800)
    
#     async def _sync_pending_listings(self):
#         """Sync pending listings with blockchain"""
#         try:
#             # Get pending listings that need blockchain sync
#             db = next(get_db())
#             pending_listings = db.query(Listing).filter(
#                 Listing.status == "active",
#                 Listing.blockchain_tx_id.is_(None)
#             ).all()
            
#             for listing in pending_listings:
#                 try:
#                     await self._sync_single_listing(listing, db)
#                 except Exception as e:
#                     logger.error(f"Error syncing listing {listing.id}: {e}")
                    
#         except Exception as e:
#             logger.error(f"Error syncing pending listings: {e}")
#         finally:
#             db.close()
    
#     async def _sync_single_listing(self, listing: Listing, db):
#         """Sync a single listing with blockchain"""
#         try:
#             # Get NFT and user information
#             nft = db.query(NFT).filter(NFT.id == listing.nft_id).first()
#             user = db.query(User).filter(User.id == listing.seller_id).first()
            
#             if not nft or not user:
#                 logger.error(f"Missing NFT or user for listing {listing.id}")
#                 return
            
#             # Simulate blockchain sync (in real implementation, this would call Sui client)
#             tx_id = f"0x{listing.id.replace('-', '')[:16]}"
            
#             # Update listing with blockchain transaction ID
#             listing.blockchain_tx_id = tx_id
#             listing.updated_at = datetime.utcnow()
            
#             # Create transaction history record
#             tx_history = TransactionHistory(
#                 user_id=user.id,
#                 nft_id=nft.id,
#                 transaction_type="listing_created",
#                 blockchain_tx_id=tx_id,
#                 amount=listing.price,
#                 status="completed"
#             )
            
#             db.add(tx_history)
#             db.commit()
            
#             logger.info(f"Synced listing {listing.id} with blockchain tx {tx_id}")
            
#         except Exception as e:
#             logger.error(f"Error syncing single listing {listing.id}: {e}")
#             db.rollback()
    
#     async def _monitor_price_changes(self):
#         """Enhanced price monitoring with advanced pattern detection"""
#         try:
#             db = next(get_db())
            
#             # Get recent price changes
#             recent_history = db.query(ListingHistory).filter(
#                 ListingHistory.action == "updated",
#                 ListingHistory.timestamp >= datetime.utcnow() - timedelta(hours=24)
#             ).all()
            
#             for record in recent_history:
#                 if record.old_price and record.new_price:
#                     price_change_percent = abs(record.new_price - record.old_price) / record.old_price * 100
                    
#                     # Enhanced suspicious price change detection
#                     if price_change_percent > 50:
#                         logger.warning(f"Suspicious price change detected: {price_change_percent:.2f}% for listing {record.listing_id}")
#                         await self._flag_suspicious_pricing(record, db)
#                     elif price_change_percent > 25:
#                         logger.info(f"Significant price change: {price_change_percent:.2f}% for listing {record.listing_id}")
#                         await self._log_price_change(record, db)
            
#         except Exception as e:
#             logger.error(f"Error monitoring price changes: {e}")
#         finally:
#             db.close()
    
#     async def _detect_price_manipulation_patterns(self):
#         """Detect sophisticated price manipulation patterns"""
#         try:
#             db = next(get_db())
            
#             # Get all listings for a user in the last 24 hours
#             recent_listings = db.query(Listing).filter(
#                 Listing.created_at >= datetime.utcnow() - timedelta(hours=24)
#             ).all()
            
#             # Group by seller
#             seller_listings = {}
#             for listing in recent_listings:
#                 if listing.seller_id not in seller_listings:
#                     seller_listings[listing.seller_id] = []
#                 seller_listings[listing.seller_id].append(listing)
            
#             # Check for suspicious patterns
#             for seller_id, listings in seller_listings.items():
#                 if len(listings) > 10:  # User listed more than 10 NFTs in 24 hours
#                     logger.warning(f"High volume listing detected for seller {seller_id}: {len(listings)} listings")
#                     await self._flag_high_volume_seller(seller_id, listings, db)
                
#                 # Check for price manipulation patterns
#                 prices = [float(l.price) for l in listings]
#                 if len(prices) > 3:
#                     price_variance = statistics.variance(prices)
#                     if price_variance > 1000:  # High price variance
#                         logger.warning(f"High price variance detected for seller {seller_id}: {price_variance}")
#                         await self._flag_price_variance(seller_id, listings, db)
            
#         except Exception as e:
#             logger.error(f"Error detecting price manipulation patterns: {e}")
#         finally:
#             db.close()
    
#     async def _update_price_statistics(self):
#         """Update marketplace price statistics"""
#         try:
#             db = next(get_db())
            
#             # Calculate marketplace statistics
#             active_listings = db.query(Listing).filter(Listing.status == "active").all()
            
#             if active_listings:
#                 prices = [float(l.price) for l in active_listings]
                
#                 stats = {
#                     "total_listings": len(active_listings),
#                     "average_price": statistics.mean(prices),
#                     "median_price": statistics.median(prices),
#                     "min_price": min(prices),
#                     "max_price": max(prices),
#                     "price_variance": statistics.variance(prices) if len(prices) > 1 else 0,
#                     "updated_at": datetime.utcnow().isoformat()
#                 }
                
#                 # Store statistics (could be stored in cache or database)
#                 logger.info(f"Updated price statistics: {stats}")
                
#         except Exception as e:
#             logger.error(f"Error updating price statistics: {e}")
#         finally:
#             db.close()
    
#     async def _flag_suspicious_pricing(self, history_record: ListingHistory, db):
#         """Enhanced flagging of suspicious pricing behavior"""
#         try:
#             # Get NFT information
#             nft = db.query(NFT).filter(NFT.id == history_record.nft_id).first()
#             if not nft:
#                 return
            
#             # Calculate confidence score based on price change
#             price_change_percent = abs(history_record.new_price - history_record.old_price) / history_record.old_price * 100
#             confidence_score = min(0.9, price_change_percent / 100)
            
#             # Update NFT with fraud flag
#             nft.is_fraud = True
#             nft.confidence_score = confidence_score
#             nft.flag_type = 3  # Price manipulation flag
#             nft.reason = f"Suspicious price change: {price_change_percent:.2f}% in 24 hours"
            
#             # Enhanced analysis details
#             if not nft.analysis_details:
#                 nft.analysis_details = {}
            
#             nft.analysis_details.update({
#                 "price_manipulation_detected": True,
#                 "price_change_percent": price_change_percent,
#                 "old_price": float(history_record.old_price),
#                 "new_price": float(history_record.new_price),
#                 "confidence_score": confidence_score,
#                 "detection_timestamp": datetime.utcnow().isoformat(),
#                 "detection_method": "background_service"
#             })
            
#             db.commit()
#             logger.info(f"Flagged suspicious pricing for NFT {nft.id} with confidence {confidence_score}")
            
#         except Exception as e:
#             logger.error(f"Error flagging suspicious pricing: {e}")
#             db.rollback()
    
#     async def _flag_high_volume_seller(self, seller_id: str, listings: List[Listing], db):
#         """Flag sellers with suspiciously high listing volume"""
#         try:
#             user = db.query(User).filter(User.id == seller_id).first()
#             if not user:
#                 return
            
#             # Create fraud flag for high volume seller
#             for listing in listings:
#                 nft = db.query(NFT).filter(NFT.id == listing.nft_id).first()
#                 if nft:
#                     nft.is_fraud = True
#                     nft.confidence_score = 0.6
#                     nft.flag_type = 4  # High volume seller flag
#                     nft.reason = f"High volume seller: {len(listings)} listings in 24 hours"
                    
#                     if not nft.analysis_details:
#                         nft.analysis_details = {}
                    
#                     nft.analysis_details.update({
#                         "high_volume_seller": True,
#                         "listings_count": len(listings),
#                         "detection_timestamp": datetime.utcnow().isoformat()
#                     })
            
#             db.commit()
#             logger.warning(f"Flagged high volume seller {seller_id} with {len(listings)} listings")
            
#         except Exception as e:
#             logger.error(f"Error flagging high volume seller: {e}")
#             db.rollback()
    
#     async def _flag_price_variance(self, seller_id: str, listings: List[Listing], db):
#         """Flag sellers with suspicious price variance"""
#         try:
#             prices = [float(l.price) for l in listings]
#             variance = statistics.variance(prices)
            
#             for listing in listings:
#                 nft = db.query(NFT).filter(NFT.id == listing.nft_id).first()
#                 if nft:
#                     nft.is_fraud = True
#                     nft.confidence_score = 0.5
#                     nft.flag_type = 5  # Price variance flag
#                     nft.reason = f"High price variance: {variance:.2f} across listings"
                    
#                     if not nft.analysis_details:
#                         nft.analysis_details = {}
                    
#                     nft.analysis_details.update({
#                         "price_variance_detected": True,
#                         "price_variance": variance,
#                         "listings_count": len(listings),
#                         "detection_timestamp": datetime.utcnow().isoformat()
#                     })
            
#             db.commit()
#             logger.warning(f"Flagged price variance for seller {seller_id}: {variance}")
            
#         except Exception as e:
#             logger.error(f"Error flagging price variance: {e}")
#             db.rollback()
    
#     async def _log_price_change(self, history_record: ListingHistory, db):
#         """Log significant but not suspicious price changes"""
#         try:
#             price_change_percent = abs(history_record.new_price - history_record.old_price) / history_record.old_price * 100
            
#             logger.info(f"Significant price change logged: {price_change_percent:.2f}% for listing {history_record.listing_id}")
            
#             # Could store in analytics table for trend analysis
#             # For now, just log the change
            
#         except Exception as e:
#             logger.error(f"Error logging price change: {e}")
    
#     async def _reconcile_marketplace_state(self):
#         """Enhanced marketplace reconciliation with blockchain state"""
#         try:
#             db = next(get_db())
            
#             # Check for expired listings
#             expired_listings = db.query(Listing).filter(
#                 Listing.status == "active",
#                 Listing.expires_at < datetime.utcnow()
#             ).all()
            
#             for listing in expired_listings:
#                 # Mark listing as expired
#                 listing.status = "expired"
#                 listing.updated_at = datetime.utcnow()
                
#                 # Update NFT status
#                 nft = db.query(NFT).filter(NFT.id == listing.nft_id).first()
#                 if nft:
#                     nft.is_listed = False
#                     nft.listing_status = "expired"
                
#                 # Create history record
#                 history = ListingHistory(
#                     listing_id=listing.id,
#                     nft_id=listing.nft_id,
#                     action="expired",
#                     seller_id=listing.seller_id
#                 )
                
#                 db.add(history)
#                 logger.info(f"Marked expired listing {listing.id}")
            
#             # Check for orphaned listings (NFTs that no longer exist)
#             orphaned_listings = db.query(Listing).outerjoin(NFT).filter(
#                 Listing.status == "active",
#                 NFT.id.is_(None)
#             ).all()
            
#             for listing in orphaned_listings:
#                 listing.status = "orphaned"
#                 listing.updated_at = datetime.utcnow()
#                 logger.warning(f"Marked orphaned listing {listing.id}")
            
#             db.commit()
#             logger.info(f"Marketplace reconciliation completed: {len(expired_listings)} expired, {len(orphaned_listings)} orphaned")
            
#         except Exception as e:
#             logger.error(f"Error in marketplace reconciliation: {e}")
#         finally:
#             db.close()
    
#     async def _sync_blockchain_state(self):
#         """Sync local state with blockchain state"""
#         try:
#             # In a real implementation, this would query the blockchain
#             # to ensure our local state matches the blockchain state
#             logger.info("Syncing blockchain state...")
            
#             # Simulate blockchain sync
#             await asyncio.sleep(1)
            
#             logger.info("Blockchain state sync completed")
            
#         except Exception as e:
#             logger.error(f"Error syncing blockchain state: {e}")
    
#     async def _cleanup_orphaned_data(self):
#         """Clean up orphaned data and optimize database"""
#         try:
#             db = next(get_db())
            
#             # Clean up old history records (older than 90 days)
#             cutoff_date = datetime.utcnow() - timedelta(days=90)
#             old_history = db.query(ListingHistory).filter(
#                 ListingHistory.timestamp < cutoff_date
#             ).all()
            
#             for record in old_history:
#                 db.delete(record)
            
#             db.commit()
#             logger.info(f"Cleaned up {len(old_history)} old history records")
            
#         except Exception as e:
#             logger.error(f"Error cleaning up orphaned data: {e}")
#         finally:
#             db.close()
    
#     async def _update_marketplace_analytics(self):
#         """Update marketplace analytics and metrics"""
#         try:
#             db = next(get_db())
            
#             # Calculate marketplace metrics
#             total_listings = db.query(Listing).filter(Listing.status == "active").count()
#             total_users = db.query(User).count()
#             total_nfts = db.query(NFT).count()
            
#             # Calculate fraud detection metrics
#             fraud_nfts = db.query(NFT).filter(NFT.is_fraud == True).count()
#             fraud_rate = (fraud_nfts / total_nfts * 100) if total_nfts > 0 else 0
            
#             analytics = {
#                 "total_listings": total_listings,
#                 "total_users": total_users,
#                 "total_nfts": total_nfts,
#                 "fraud_nfts": fraud_nfts,
#                 "fraud_rate": fraud_rate,
#                 "updated_at": datetime.utcnow().isoformat()
#             }
            
#             logger.info(f"Updated marketplace analytics: {analytics}")
            
#         except Exception as e:
#             logger.error(f"Error updating marketplace analytics: {e}")
#         finally:
#             db.close()
    
#     async def _generate_performance_reports(self):
#         """Generate performance reports for monitoring"""
#         try:
#             report = {
#                 "service_metrics": self.performance_metrics,
#                 "timestamp": datetime.utcnow().isoformat(),
#                 "status": "healthy" if self.running else "stopped"
#             }
            
#             logger.info(f"Performance report generated: {report}")
            
#         except Exception as e:
#             logger.error(f"Error generating performance reports: {e}")
    
#     async def _update_user_metrics(self):
#         """Update user-specific metrics and analytics"""
#         try:
#             db = next(get_db())
            
#             # Calculate user activity metrics
#             active_users = db.query(User).join(Listing).filter(
#                 Listing.status == "active"
#             ).distinct().count()
            
#             # Top sellers by listing count
#             top_sellers = db.query(
#                 User.username,
#                 func.count(Listing.id).label('listing_count')
#             ).join(Listing).filter(
#                 Listing.status == "active"
#             ).group_by(User.username).order_by(
#                 func.count(Listing.id).desc()
#             ).limit(10).all()
            
#             user_metrics = {
#                 "active_users": active_users,
#                 "top_sellers": [{"username": seller[0], "listings": seller[1]} for seller in top_sellers],
#                 "updated_at": datetime.utcnow().isoformat()
#             }
            
#             logger.info(f"Updated user metrics: {user_metrics}")
            
#         except Exception as e:
#             logger.error(f"Error updating user metrics: {e}")
#         finally:
#             db.close()
    
#     async def _run_fraud_detection_analysis(self):
#         """Run comprehensive fraud detection analysis"""
#         try:
#             db = next(get_db())
            
#             # Get recent listings for analysis
#             recent_listings = db.query(Listing).filter(
#                 Listing.created_at >= datetime.utcnow() - timedelta(hours=24)
#             ).all()
            
#             for listing in recent_listings:
#                 nft = db.query(NFT).filter(NFT.id == listing.nft_id).first()
#                 if nft:
#                     # Run fraud detection analysis
#                     fraud_result = await self._analyze_listing_for_fraud(listing, nft, db)
                    
#                     if fraud_result["is_fraud"]:
#                         nft.is_fraud = True
#                         nft.confidence_score = fraud_result["confidence"]
#                         nft.flag_type = fraud_result["flag_type"]
#                         nft.reason = fraud_result["reason"]
                        
#                         if not nft.analysis_details:
#                             nft.analysis_details = {}
                        
#                         nft.analysis_details.update(fraud_result["details"])
                        
#                         db.commit()
#                         logger.warning(f"Fraud detected for NFT {nft.id}: {fraud_result['reason']}")
            
#         except Exception as e:
#             logger.error(f"Error running fraud detection analysis: {e}")
#         finally:
#             db.close()
    
#     async def _analyze_listing_for_fraud(self, listing: Listing, nft: NFT, db) -> Dict[str, Any]:
#         """Analyze a single listing for fraud patterns"""
#         try:
#             fraud_indicators = []
#             confidence_score = 0.0
            
#             # Check for suspicious pricing
#             if listing.price > 1000:  # Very high price
#                 fraud_indicators.append("suspicious_high_price")
#                 confidence_score += 0.3
            
#             # Check for rapid price changes
#             recent_updates = db.query(ListingHistory).filter(
#                 ListingHistory.listing_id == listing.id,
#                 ListingHistory.action == "updated",
#                 ListingHistory.timestamp >= datetime.utcnow() - timedelta(hours=1)
#             ).count()
            
#             if recent_updates > 5:  # Too many price updates
#                 fraud_indicators.append("rapid_price_changes")
#                 confidence_score += 0.4
            
#             # Check seller history
#             seller_listings = db.query(Listing).filter(
#                 Listing.seller_id == listing.seller_id,
#                 Listing.created_at >= datetime.utcnow() - timedelta(hours=24)
#             ).count()
            
#             if seller_listings > 20:  # Too many listings
#                 fraud_indicators.append("high_volume_seller")
#                 confidence_score += 0.3
            
#             is_fraud = len(fraud_indicators) > 0
#             confidence_score = min(confidence_score, 0.9)
            
#             return {
#                 "is_fraud": is_fraud,
#                 "confidence": confidence_score,
#                 "flag_type": 6 if is_fraud else 0,  # Background service flag
#                 "reason": f"Fraud indicators: {', '.join(fraud_indicators)}" if is_fraud else "No fraud detected",
#                 "details": {
#                     "fraud_indicators": fraud_indicators,
#                     "detection_timestamp": datetime.utcnow().isoformat(),
#                     "detection_method": "background_service_analysis"
#                 }
#             }
            
#         except Exception as e:
#             logger.error(f"Error analyzing listing for fraud: {e}")
#             return {
#                 "is_fraud": False,
#                 "confidence": 0.0,
#                 "flag_type": 0,
#                 "reason": "Analysis error",
#                 "details": {}
#             }
    
#     async def _update_fraud_patterns(self):
#         """Update fraud detection patterns based on new data"""
#         try:
#             # This would update machine learning models or pattern recognition
#             # For now, just log the update
#             logger.info("Updated fraud detection patterns")
            
#         except Exception as e:
#             logger.error(f"Error updating fraud patterns: {e}")
    
#     async def _flag_suspicious_activities(self):
#         """Flag suspicious activities based on patterns"""
#         try:
#             db = next(get_db())
            
#             # Check for suspicious user activities
#             suspicious_users = db.query(User).join(Listing).filter(
#                 Listing.created_at >= datetime.utcnow() - timedelta(hours=1)
#             ).group_by(User.id).having(
#                 func.count(Listing.id) > 10
#             ).all()
            
#             for user in suspicious_users:
#                 logger.warning(f"Suspicious activity detected for user {user.username}")
#                 # Could implement user flagging here
            
#         except Exception as e:
#             logger.error(f"Error flagging suspicious activities: {e}")
#         finally:
#             db.close()
    
#     async def _log_performance_metrics(self):
#         """Log performance metrics for monitoring"""
#         try:
#             logger.info(f"Service performance metrics: {self.performance_metrics}")
            
#             # Reset counters periodically
#             if self.performance_metrics["sync_operations"] > 1000:
#                 self.performance_metrics = {
#                     "sync_operations": 0,
#                     "price_changes_detected": 0,
#                     "fraud_flags_created": 0,
#                     "reconciliation_cycles": 0,
#                     "analytics_updates": 0
#                 }
                
#         except Exception as e:
#             logger.error(f"Error logging performance metrics: {e}")
    
#     async def _check_service_health(self):
#         """Check service health and log status"""
#         try:
#             health_status = {
#                 "service_running": self.running,
#                 "active_tasks": len(asyncio.all_tasks()),
#                 "memory_usage": "normal",  # Could implement actual memory monitoring
#                 "last_activity": datetime.utcnow().isoformat()
#             }
            
#             logger.info(f"Service health check: {health_status}")
            
#         except Exception as e:
#             logger.error(f"Error checking service health: {e}")
    
#     async def sync_listing_update(self, listing_id: UUID, new_price: float):
#         """Enhanced sync listing price update with blockchain"""
#         try:
#             db = next(get_db())
#             listing = db.query(Listing).filter(Listing.id == listing_id).first()
            
#             if not listing:
#                 logger.error(f"Listing {listing_id} not found for update sync")
#                 return
            
#             # Record old price for history
#             old_price = listing.price
            
#             # Update listing price
#             listing.price = new_price
#             listing.updated_at = datetime.utcnow()
            
#             # Create history record
#             history = ListingHistory(
#                 listing_id=listing.id,
#                 nft_id=listing.nft_id,
#                 action="updated",
#                 old_price=old_price,
#                 new_price=new_price,
#                 seller_id=listing.seller_id
#             )
            
#             db.add(history)
#             db.commit()
            
#             logger.info(f"Enhanced synced price update for listing {listing_id}: {old_price} -> {new_price}")
            
#         except Exception as e:
#             logger.error(f"Error syncing listing update {listing_id}: {e}")
#         finally:
#             db.close()
    
#     async def sync_listing_deletion(self, listing_id: UUID):
#         """Enhanced sync listing deletion with blockchain"""
#         try:
#             db = next(get_db())
#             listing = db.query(Listing).filter(Listing.id == listing_id).first()
            
#             if not listing:
#                 logger.error(f"Listing {listing_id} not found for deletion sync")
#                 return
            
#             # Create history record
#             history = ListingHistory(
#                 listing_id=listing.id,
#                 nft_id=listing.nft_id,
#                 action="deleted",
#                 old_price=listing.price,
#                 seller_id=listing.seller_id
#             )
            
#             db.add(history)
#             db.commit()
            
#             logger.info(f"Enhanced synced listing deletion {listing_id}")
            
#         except Exception as e:
#             logger.error(f"Error syncing listing deletion {listing_id}: {e}")
#         finally:
#             db.close()

# # Global service instance
# listing_sync_service = ListingSyncService()

# async def start_listing_sync_service():
#     """Start the enhanced listing synchronization service"""
#     await listing_sync_service.start()

# async def stop_listing_sync_service():
#     """Stop the listing synchronization service"""
#     await listing_sync_service.stop()

# async def get_listing_sync_service():
#     """Get the global listing sync service instance"""
#     return listing_sync_service 